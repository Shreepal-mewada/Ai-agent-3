import { Router } from "express";
import { createPod } from '../kubernetes/pod.js';
import { createService } from '../kubernetes/service.js';
import { createSandboxKey } from '../config/redis.js';
import { v7 as uuid } from "uuid"
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const bucketName = "shree-bucket-aiii";

const router = Router();


router.post('/project', authMiddleware, async (req, res) => {
    const { title } = req.body;

    const newProject = new Project({
        user: req.user.id,
        title
    });

    await newProject.save();

    return res.status(201).json({
        message: 'Project created successfully',
        project: newProject
    });
})

router.post("/start", authMiddleware, async (req, res) => {

    const projectId = req.body.projectId;

    // Verify that the project belongs to the authenticated user
    const project = await Project.findOne({ _id: projectId, user: req.user.id });

    if (!project) {
        return res.status(404).json({ message: 'Project not found or access denied' });
    }

    const sandboxId = uuid();

    await Promise.all([
        createPod(sandboxId, projectId),
        createService(sandboxId),
        createSandboxKey(sandboxId)
    ]);

    return res.status(201).json({
        message: 'Sandbox environment created successfully',
        sandboxId,
        previewUrl: `http://${sandboxId}.preview.localhost`
    })
})

router.get("/project", authMiddleware, async (req, res) => {
    const projects = await Project.find({ user: req.user.id });

    return res.status(200).json({
        message: 'Projects retrieved successfully',
        projects
    })
})

const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

router.get("/project/:projectId/export", authMiddleware, async (req, res) => {
    const { projectId } = req.params;

    try {
        const project = await Project.findOne({ _id: projectId, user: req.user.id });
        if (!project) {
            return res.status(404).json({ message: "Project not found or access denied" });
        }

        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `${projectId}/`
        });
        const listResponse = await s3Client.send(listCommand);
        const s3Objects = listResponse.Contents || [];

        if (s3Objects.length === 0) {
            return res.status(404).json({ message: "No files found for this project in cloud storage" });
        }

        const zip = new AdmZip();

        for (const file of s3Objects) {
            if (file.Key.endsWith('/')) continue; // Skip directory placeholder

            const getCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: file.Key
            });
            const getResponse = await s3Client.send(getCommand);
            const buffer = await streamToBuffer(getResponse.Body);
            const relativePath = file.Key.replace(`${projectId}/`, '');
            
            zip.addFile(relativePath, buffer);
        }

        const zipBuffer = zip.toBuffer();
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip"`);
        return res.send(zipBuffer);
    } catch (error) {
        console.error("Export project error:", error);
        return res.status(500).json({ message: "Error exporting project: " + error.message });
    }
});


export default router;
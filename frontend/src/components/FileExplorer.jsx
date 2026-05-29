import { useState, useEffect, useCallback } from 'react'
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  FileText, 
  FileImage, 
  Search, 
  RefreshCw, 
  Pin,
  Settings,
  ChevronDown,
  LayoutGrid,
  Bell,
  Code,
  Sparkles
} from 'lucide-react'

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="w-3.5 h-3.5 text-[#8C4C4C]/85" />
    case 'json':
    case 'yml':
    case 'yaml':
    case 'lock':
      return <FileText className="w-3.5 h-3.5 text-[#705A5A]/80" />
    case 'md':
      return <FileText className="w-3.5 h-3.5 text-[#705A5A]/60" />
    case 'css':
    case 'html':
      return <FileCode className="w-3.5 h-3.5 text-[#8C4C4C]/85" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'ico':
      return <FileImage className="w-3.5 h-3.5 text-[#9CA3AF]/60" />
    default:
      return <File className="w-3.5 h-3.5 text-[#9CA3AF]/50" />
  }
}

function buildTree(files) {
  const root = {}
  files.forEach(path => {
    const parts = path.split('/')
    let node = root
    parts.forEach((part, i) => {
      if (!node[part]) node[part] = i === parts.length - 1 ? null : {}
      if (i < parts.length - 1) node = node[part]
    })
  })
  return root
}

function TreeNode({ name, node, depth, activeFile, onFileSelect, path, onPinToggle, isPinned }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir = node !== null && typeof node === 'object'
  const fullPath = path ? `${path}/${name}` : name
  const isActive = activeFile === fullPath

  if (isDir) {
    return (
      <div>
        <button 
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 w-full text-left px-2.5 py-1 rounded transition-colors duration-150 cursor-pointer select-none"
          style={{
            paddingLeft: `${10 + depth * 12}px`,
            color: '#9CA3AF',
            fontSize: '12px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,253,253,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <ChevronDown 
            className="w-3 h-3 text-[#705A5A]/65 transition-transform duration-200 shrink-0" 
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} 
          />
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-[#8C4C4C] shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-[#8C4C4C] shrink-0" />
          )}
          <span className="truncate font-medium text-[#541A1A]">{name}</span>
        </button>
        {open && (
          <div className="flex flex-col">
            {Object.entries(node).sort(([, a], [, b]) => {
              const aDir = a !== null && typeof a === 'object'
              const bDir = b !== null && typeof b === 'object'
              return bDir - aDir
            }).map(([childName, childNode]) => (
              <TreeNode 
                key={childName} 
                name={childName} 
                node={childNode}
                depth={depth + 1} 
                activeFile={activeFile}
                onFileSelect={onFileSelect} 
                path={fullPath}
                onPinToggle={onPinToggle}
                isPinned={isPinned}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const pinned = isPinned(fullPath)

  return (
    <div 
      className="group relative flex items-center w-full rounded"
      style={{
        paddingLeft: `${18 + depth * 12}px`,
        background: isActive ? 'rgba(84, 26, 26, 0.06)' : 'transparent',
      }}
    >
      <button 
        onClick={() => onFileSelect(fullPath)}
        className="flex items-center gap-2 flex-1 text-left py-1.5 pr-8 truncate transition-all duration-150 cursor-pointer select-none text-[12px]"
        style={{
          color: isActive ? '#541A1A' : '#705A5A',
          fontWeight: isActive ? '600' : '400'
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#541A1A' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#705A5A' }}
      >
        <span className="shrink-0">{getFileIcon(name)}</span>
        <span className="truncate">{name}</span>
      </button>

      {/* Pin toggle button on hover */}
      <button
        onClick={() => onPinToggle(fullPath)}
        className={`absolute right-2 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/5 transition-all cursor-pointer ${pinned ? '!opacity-70 text-[#541A1A]' : 'text-[#705A5A]/40'}`}
        title={pinned ? 'Unpin file' : 'Pin file'}
      >
        <Pin className="w-2.5 h-2.5" fill={pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export default function FileExplorer({ agentBase, activeFile, onFileSelect, refreshKey, showToast }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tree, setTree] = useState({})
  const [search, setSearch] = useState('')
  const [pinnedFiles, setPinnedFiles] = useState(['src/App.jsx', 'index.html', 'src/index.css'])
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!agentBase) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${agentBase}/list-files`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFiles(data.files || [])
      setTree(buildTree(data.files || []))
    } catch (err) {
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [agentBase])

  useEffect(() => { 
    fetchFiles() 
  }, [fetchFiles, refreshKey])

  const handlePinToggle = (filePath) => {
    setPinnedFiles(prev => {
      const exists = prev.includes(filePath)
      if (exists) {
        showToast(`Unpinned ${filePath.split('/').pop()}`, 'info')
        return prev.filter(f => f !== filePath)
      } else {
        showToast(`Pinned ${filePath.split('/').pop()}`, 'success')
        return [...prev, filePath]
      }
    })
  }

  const isPinned = (filePath) => pinnedFiles.includes(filePath)

  const filteredFiles = files.filter(f => 
    f.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className="flex flex-col h-full bg-[#fff8f3] text-[#541A1A] select-none">
      
      {/* Workspace Switcher Header */}
      <div className="p-3 border-b border-[#541A1A]/12 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6.5 h-6.5 rounded-md flex items-center justify-center bg-[#541A1A]/10 border border-[#541A1A]/20 shrink-0">
              <Code className="w-3.5 h-3.5 text-[#541A1A]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#705A5A]">Workspace</span>
              <h4 className="text-xs font-bold truncate leading-tight text-[#541A1A] mt-px">active-sandbox</h4>
            </div>
          </div>

          <button 
            onClick={fetchFiles} 
            className="p-1 rounded-lg text-[#705A5A] hover:text-[#541A1A] hover:bg-[#541A1A]/6 transition-colors cursor-pointer shrink-0"
            title="Refresh files"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live File Search */}
        <div className="relative flex items-center bg-[#F1E2D1] border border-[#541A1A]/15 rounded-lg px-2 py-1 focus-within:border-[#541A1A]/40 transition-all">
          <Search className="w-3 h-3 text-[#9CA3AF]/40 mr-1.5 shrink-0" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-transparent text-xs text-[#541A1A] outline-none w-full placeholder-[#6E5E4E]/45"
          />
        </div>
      </div>

      {/* Pinned Files section */}
      {!search && pinnedFiles.length > 0 && (
        <div className="shrink-0 border-b border-[#541A1A]/12 py-2">
          <button 
            onClick={() => setPinnedCollapsed(!pinnedCollapsed)}
            className="flex items-center justify-between w-full px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-[#705A5A] cursor-pointer hover:text-[#541A1A]"
          >
            <span className="flex items-center gap-1.5">
              <Pin className="w-3 h-3 text-[#541A1A]" fill="currentColor" />
              Pinned Files
            </span>
            <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: pinnedCollapsed ? 'rotate(-90deg)' : 'none' }} />
          </button>

          {!pinnedCollapsed && (
            <div className="flex flex-col mt-1 px-1.5">
              {pinnedFiles.map(filePath => {
                const name = filePath.split('/').pop()
                const isActive = activeFile === filePath
                return (
                  <div 
                    key={filePath}
                    className="flex items-center justify-between rounded px-2.5 py-1 text-[11px] group transition-colors"
                    style={{
                      background: isActive ? 'rgba(84, 26, 26, 0.06)' : 'transparent',
                    }}
                  >
                    <button
                      onClick={() => onFileSelect(filePath)}
                      className="flex items-center gap-1.5 flex-1 text-left truncate cursor-pointer font-medium"
                      style={{ color: isActive ? '#541A1A' : '#705A5A' }}
                    >
                      {getFileIcon(name)}
                      <span className="truncate">{name}</span>
                    </button>
                    <button 
                      onClick={() => handlePinToggle(filePath)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#705A5A]/40 hover:text-[#541A1A] hover:bg-[#541A1A]/5 transition-all cursor-pointer"
                      title="Unpin"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* File Tree Explorer Area */}
      <div className="flex-1 overflow-y-auto py-2">
        {search ? (
          <div className="flex flex-col px-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] px-2.5 mb-1 block">
              Search Results
            </span>
            {filteredFiles.length === 0 ? (
              <div className="px-2.5 py-3 text-xs text-[#9CA3AF] italic">No files found</div>
            ) : (
              filteredFiles.map(filePath => {
                const name = filePath.split('/').pop()
                const isActive = activeFile === filePath
                return (
                  <button
                    key={filePath}
                    onClick={() => onFileSelect(filePath)}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded transition-all duration-150 cursor-pointer select-none text-[11px]"
                    style={{
                      background: isActive ? 'rgba(84, 26, 26, 0.06)' : 'transparent',
                      color: isActive ? '#541A1A' : '#705A5A'
                    }}
                  >
                    <span>{getFileIcon(name)}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{name}</span>
                      <span className="truncate text-[9px] text-[#705A5A]/50 -mt-0.5">{filePath}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-[#541A1A]/20 border-t-[#541A1A] animate-spin" />
          </div>
        ) : error ? (
          <div className="px-3.5 py-4 text-xs text-[#9C3D3D]">{error}</div>
        ) : (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] px-3.5 mb-1.5 block">
              Workspace Files
            </span>
            <div className="flex flex-col">
              {Object.entries(tree).sort(([, a], [, b]) => {
                const aDir = a !== null && typeof a === 'object'
                const bDir = b !== null && typeof b === 'object'
                return bDir - aDir
              }).map(([name, node]) => (
                <TreeNode 
                  key={name} 
                  name={name} 
                  node={node}
                  depth={0} 
                  activeFile={activeFile}
                  onFileSelect={onFileSelect} 
                  path=""
                  onPinToggle={handlePinToggle}
                  isPinned={isPinned}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer row */}
      <div className="p-3 border-t border-[#541A1A]/12 shrink-0 flex items-center justify-between bg-[#fff8f3] relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#541A1A] text-[#fff8f3] flex items-center justify-center text-[10px] font-bold shrink-0">
            FD
          </div>
          <div className="min-w-0">
            <h5 className="text-[11px] font-bold text-[#541A1A] truncate leading-none">Findevor Host</h5>
            <span className="text-[9px] text-[#705A5A] leading-none block mt-0.5">Secure Container</span>
          </div>
        </div>

        <button 
          className="p-1.5 rounded-lg text-[#705A5A] hover:text-[#541A1A] hover:bg-[#541A1A]/5 transition-colors cursor-pointer shrink-0"
          title="Sandbox System Settings"
          onClick={() => showToast('Fintech Sandbox v1.0.0 is Active', 'info')}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

    </aside>
  )
}

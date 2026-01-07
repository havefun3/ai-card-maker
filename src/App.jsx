import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Download, Layout, Palette, Type, Sparkles, Monitor, Smartphone, Grid, Layers, Table as TableIcon } from 'lucide-react';

// --- 1. Markdown Parsing Logic (Blockifier) ---
const parseMarkdownToBlocks = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = { type: 'paragraph', content: [] };

  const flushBlock = () => {
    if (currentBlock.content.length > 0) {
      blocks.push({ ...currentBlock, id: Math.random().toString(36).substr(2, 9) });
    }
    currentBlock = { type: 'paragraph', content: [] };
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code Blocks
    if (trimmed.startsWith('```')) {
      flushBlock();
      const codeLines = [];
      i++; 
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines, id: Math.random().toString(36).substr(2, 9) });
      i++;
      continue;
    }

    // Tables
    if (trimmed.startsWith('|')) {
      flushBlock();
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'table', content: tableLines, id: Math.random().toString(36).substr(2, 9) });
      continue;
    }

    // Separators
    if (trimmed === '---') {
      flushBlock();
      blocks.push({ type: 'separator', content: ['---'], id: Math.random().toString(36).substr(2, 9) });
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('#')) {
      flushBlock();
      blocks.push({ type: 'header', content: [line], id: Math.random().toString(36).substr(2, 9) });
      i++;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('>')) {
      if (currentBlock.type !== 'quote') flushBlock();
      currentBlock.type = 'quote';
      currentBlock.content.push(line);
      i++;
      continue;
    }

    // Lists
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (currentBlock.type !== 'list') flushBlock();
      currentBlock.type = 'list';
      currentBlock.content.push(line);
      i++;
      continue;
    }

    // Empty Lines
    if (trimmed === '') {
      flushBlock();
      i++;
      continue;
    }

    // Paragraphs
    if (currentBlock.type !== 'paragraph' && currentBlock.type !== 'list' && currentBlock.type !== 'quote') flushBlock();
    currentBlock.type = 'paragraph';
    currentBlock.content.push(line);
    i++;
  }
  flushBlock();
  return blocks;
};

// --- 2. Renderers (Adjusted for Compactness) ---

const formatInline = (text, theme) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className={`font-bold ${theme.boldColor}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      // Inline code: text-xs, tighter padding
      return <code key={i} className={`px-1 py-0.5 rounded ${theme.inlineCodeBg} font-mono text-xs ${theme.accentColor}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const TableRenderer = ({ lines, theme }) => {
    if (lines.length < 2) return null;
    const parseRow = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    const headers = parseRow(lines[0]);
    const rows = lines.slice(2).map(parseRow);

    return (
        <div className="my-3 overflow-hidden rounded-lg border border-opacity-50 inline-block min-w-full" style={{ borderColor: theme.tableBorderColor || 'rgba(0,0,0,0.1)' }}>
            <table className="min-w-full text-xs">
                <thead>
                    <tr className={`${theme.tableHeaderBg}`}>
                        {headers.map((header, i) => (
                            <th key={i} className={`px-3 py-1.5 text-left font-bold border-b ${theme.tableBorderColor} ${theme.headingColor}`}>
                                {formatInline(header, theme)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={theme.tableBodyBg}>
                    {rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? theme.tableRowEven : theme.tableRowOdd}>
                            {row.map((cell, j) => (
                                <td key={j} className={`px-3 py-1.5 border-b last:border-0 ${theme.tableBorderColor}`}>
                                    {formatInline(cell, theme)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Single Block Renderer
const BlockRenderer = ({ block, theme }) => {
  const text = block.content.join('\n');

  switch (block.type) {
    case 'code':
      return (
        // Compact Code: text-xs, smaller padding
        <div className={`${theme.codeBg} ${theme.codeText} p-2.5 rounded-lg font-mono text-xs border-l-2 ${theme.accentColor} my-2 whitespace-pre-wrap break-words leading-5`}>
          {text}
        </div>
      );
    case 'table':
      return <TableRenderer lines={block.content} theme={theme} />;
    case 'separator':
      return <hr className={`my-4 border-t ${theme.lineColor} border-dashed`} />;
    case 'header':
      const level = block.content[0].match(/^#+/)[0].length;
      const cleanText = block.content[0].replace(/^#+\s/, '');
      // Significantly reduced header sizes for "Card" aesthetic
      const sizes = { 
          1: 'text-xl mt-3 mb-2', // Was 3xl
          2: 'text-lg mt-3 mb-2', // Was 2xl
          3: 'text-base mt-2 mb-1' // Was xl
      };
      return <h1 className={`${sizes[level] || 'text-base'} font-bold ${theme.headingColor} leading-tight`}>{cleanText}</h1>;
    case 'quote':
      return (
        <div className={`pl-3 py-1 border-l-2 ${theme.quoteBorder} ${theme.quoteBg} rounded-r my-2`}>
           {block.content.map((line, i) => (
             <p key={i} className={`italic text-sm ${theme.quoteText}`}>{formatInline(line.replace(/^>\s?/, ''), theme)}</p>
           ))}
        </div>
      );
    case 'list':
      return (
        <div className="my-2 space-y-0.5"> {/* Tighter list spacing */}
          {block.content.map((line, i) => {
             const isNum = /^\d+\.\s/.test(line);
             const clean = line.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
             return (
               <div key={i} className="flex items-start space-x-2 text-sm">
                  {isNum ? (
                    <span className={`font-bold ${theme.accentColor} min-w-[1.2em]`}>{line.split('.')[0]}.</span>
                  ) : (
                    <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${theme.bulletColor}`}></span>
                  )}
                  <span className="flex-1 leading-relaxed">{formatInline(clean, theme)}</span>
               </div>
             )
          })}
        </div>
      );
    default: // paragraph
      return (
        <div className="my-1.5">
            {block.content.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap break-words">{formatInline(line, theme)}</p>
            ))}
        </div>
      );
  }
};


// --- 3. Configuration ---

const THEMES = {
  minimal: {
    name: "极简白",
    bg: "bg-white",
    containerBg: "bg-white",
    textColor: "text-gray-700",
    headingColor: "text-gray-900",
    boldColor: "text-black",
    codeBg: "bg-gray-50",
    codeText: "text-gray-800",
    inlineCodeBg: "bg-gray-100",
    quoteBorder: "border-gray-300",
    quoteBg: "bg-transparent",
    quoteText: "text-gray-500",
    accentColor: "text-blue-600 border-blue-600",
    bulletColor: "bg-gray-300",
    lineColor: "border-gray-200",
    tableHeaderBg: "bg-gray-100",
    tableRowEven: "bg-gray-50",
    tableRowOdd: "bg-white",
    tableBorderColor: "border-gray-200",
    fontBody: "font-sans",
    shadow: "shadow-none",
    padding: "p-6", // Reduced from p-8
    decoration: "none"
  },
  dark: {
    name: "深空黑",
    bg: "bg-gray-950",
    containerBg: "bg-gray-900",
    textColor: "text-gray-300",
    headingColor: "text-white",
    boldColor: "text-white",
    codeBg: "bg-gray-950",
    codeText: "text-green-400",
    inlineCodeBg: "bg-gray-800",
    quoteBorder: "border-green-500",
    quoteBg: "bg-gray-800/50",
    quoteText: "text-gray-400",
    accentColor: "text-green-400 border-green-500",
    bulletColor: "bg-gray-600",
    lineColor: "border-gray-700",
    tableHeaderBg: "bg-gray-800",
    tableRowEven: "bg-gray-800/30",
    tableRowOdd: "bg-transparent",
    tableBorderColor: "border-gray-700",
    fontBody: "font-sans",
    shadow: "shadow-2xl shadow-black/50",
    padding: "p-6",
    decoration: "none"
  },
  gradient: {
    name: "落日橙",
    bg: "bg-gradient-to-br from-orange-100 via-rose-100 to-amber-100",
    containerBg: "bg-white/90 backdrop-blur-sm border border-white/50",
    textColor: "text-gray-700",
    headingColor: "text-rose-600",
    boldColor: "text-orange-900",
    codeBg: "bg-orange-50",
    codeText: "text-orange-800",
    inlineCodeBg: "bg-white",
    quoteBorder: "border-rose-400",
    quoteBg: "bg-rose-50/50",
    quoteText: "text-rose-700",
    accentColor: "text-rose-500 border-rose-400",
    bulletColor: "bg-rose-400",
    lineColor: "border-rose-200",
    tableHeaderBg: "bg-rose-100/50",
    tableRowEven: "bg-orange-50/30",
    tableRowOdd: "bg-transparent",
    tableBorderColor: "border-rose-200",
    fontBody: "font-sans",
    shadow: "shadow-xl shadow-orange-500/10",
    padding: "p-6",
    decoration: "gradient"
  },
  glass: {
    name: "极光紫",
    bg: "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900",
    containerBg: "bg-white/10 backdrop-blur-md border border-white/20",
    textColor: "text-indigo-100",
    headingColor: "text-white",
    boldColor: "text-pink-200",
    codeBg: "bg-black/30",
    codeText: "text-cyan-300",
    inlineCodeBg: "bg-white/10",
    quoteBorder: "border-purple-400",
    quoteBg: "bg-purple-500/10",
    quoteText: "text-purple-200",
    accentColor: "text-cyan-300 border-cyan-400",
    bulletColor: "bg-purple-400",
    lineColor: "border-white/20",
    tableHeaderBg: "bg-white/10",
    tableRowEven: "bg-white/5",
    tableRowOdd: "bg-transparent",
    tableBorderColor: "border-white/10",
    fontBody: "font-sans",
    shadow: "shadow-2xl shadow-purple-500/20",
    padding: "p-6",
    decoration: "glass"
  },
   paper: {
    name: "复古纸",
    bg: "bg-[#fdfbf7]",
    containerBg: "bg-[#fdfbf7] border border-stone-200",
    textColor: "text-stone-800",
    headingColor: "text-stone-900",
    boldColor: "text-stone-900",
    codeBg: "bg-stone-200/50",
    codeText: "text-stone-700",
    inlineCodeBg: "bg-stone-200",
    quoteBorder: "border-stone-400",
    quoteBg: "bg-stone-100",
    quoteText: "text-stone-600",
    accentColor: "text-stone-600 border-stone-400",
    bulletColor: "bg-stone-400",
    lineColor: "border-stone-300",
    tableHeaderBg: "bg-stone-200/50",
    tableRowEven: "bg-stone-100/50",
    tableRowOdd: "bg-transparent",
    tableBorderColor: "border-stone-300",
    fontBody: "font-serif",
    shadow: "shadow-lg shadow-stone-500/10",
    padding: "p-8",
    decoration: "texture"
  }
};

const ASPECT_RATIOS = {
  auto: { name: "长图 (Auto)", width: 450, height: null, icon: <Smartphone size={18} /> },
  square: { name: "正方形 (1:1)", width: 450, height: 450, icon: <Grid size={18} /> },
  landscape: { name: "宽屏 (16:9)", width: 800, height: 450, icon: <Monitor size={18} /> },
};


export default function App() {
  const [text, setText] = useState(`# 精致紧凑模式

字体变小后，信息密度大幅提升。
即使是长篇大论，现在的图片数量也会明显减少。

### 1. 样式对比
旧版 H1 很大，占地面积多。
**新版 H1** 更像小标题，精致且不喧宾夺主。

| 元素 | 旧尺寸 | 新尺寸 |
| :--- | :--- | :--- |
| 正文 | 16px | **14px** |
| 代码 | 14px | **12px** |
| 标题 | 30px+ | **20px** |

### 2. 代码块演示
\`\`\`javascript
// 即使代码很长，小字号也能让它不换行
const optimizeDensity = (layout) => {
  return {
    fontSize: 'text-sm',
    padding: 'p-6',
    lineHeight: 'leading-relaxed'
  };
}
\`\`\`

> 引用块也变得更加细腻了，适合摘录 AI 的金句。

---

由于高度计算是实时的，当你切换主题或改字号时，**智能分页系统**会自动重新计算，确保每一页都塞得满满当当，且不会溢出。`);
  
  const [currentTheme, setCurrentTheme] = useState('minimal');
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [authorName, setAuthorName] = useState('AI Assistant');
  const [showAuthor, setShowAuthor] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // State for blocks and measurements
  const [blocks, setBlocks] = useState([]);
  const [blockHeights, setBlockHeights] = useState({}); // { blockId: height }
  
  const measurerRef = useRef(null);
  const previewContainerRef = useRef(null);

  // 1. Parse text to blocks
  useEffect(() => {
    setBlocks(parseMarkdownToBlocks(text));
  }, [text]);

  // 2. Measure logic
  useLayoutEffect(() => {
    if (!measurerRef.current) return;
    const measured = {};
    const nodes = measurerRef.current.children;
    for (let i = 0; i < nodes.length; i++) {
        const id = nodes[i].getAttribute('data-block-id');
        if (id) {
            measured[id] = nodes[i].offsetHeight;
        }
    }
    setBlockHeights(measured);
  }, [blocks, currentTheme, aspectRatio, text]); 

  // 3. Pagination Logic (The Core)
  const pages = useMemo(() => {
    if (ASPECT_RATIOS[aspectRatio].height === null) {
        return [blocks];
    }

    const themeConfig = THEMES[currentTheme];
    // Adjust padding calculation based on new smaller padding
    const containerPadding = themeConfig.name === '复古纸' ? 64 : 48; // p-8(32)*2 or p-6(24)*2
    // Safe height calculation
    const safeHeight = ASPECT_RATIOS[aspectRatio].height - containerPadding - 60; // 60 for header/footer buffer
    
    const paginated = [];
    let currentPage = [];
    let currentH = 0;

    blocks.forEach(block => {
        const h = blockHeights[block.id] || 0;
        
        if (h > safeHeight) {
            if (currentPage.length > 0) paginated.push(currentPage);
            paginated.push([block]);
            currentPage = [];
            currentH = 0;
            return;
        }

        if (currentH + h > safeHeight && currentPage.length > 0) {
            paginated.push(currentPage);
            currentPage = [block];
            currentH = h;
        } else {
            currentPage.push(block);
            currentH += h;
        }
    });

    if (currentPage.length > 0) paginated.push(currentPage);
    return paginated.length > 0 ? paginated : [[]]; 

  }, [blocks, blockHeights, aspectRatio, currentTheme]);


  // 4. Loader for html-to-image
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.async = true;
    script.onload = () => window.htmlToImage = window.htmlToImage;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); }
  }, []);


  const handleDownload = async () => {
    if (!window.htmlToImage || !previewContainerRef.current) {
      alert("组件加载中...");
      return;
    }
    
    setExporting(true);
    const cardElements = previewContainerRef.current.querySelectorAll('.export-card');
    
    try {
      for (let i = 0; i < cardElements.length; i++) {
        const dataUrl = await window.htmlToImage.toPng(cardElements[i], {
          quality: 1.0,
          pixelRatio: 2,
          cacheBust: true,
        });
        
        const link = document.createElement('a');
        const fileName = cardElements.length > 1 
            ? `ai-card-page-${i + 1}.png` 
            : `ai-card-${Date.now()}.png`;
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        
        if (cardElements.length > 1) await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) {
      console.error('Export failed', error);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const theme = THEMES[currentTheme];
  const currentRatio = ASPECT_RATIOS[aspectRatio];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      
      {/* --- HIDDEN MEASURER --- */}
      <div 
        ref={measurerRef} 
        className={`absolute top-0 left-0 -z-50 opacity-0 pointer-events-none ${theme.fontBody}`}
        style={{ width: currentRatio.width - (theme.name === '复古纸' ? 64 : 48) }} 
      >
        {blocks.map(block => (
            <div key={block.id} data-block-id={block.id} className="pb-3"> 
                <BlockRenderer block={block} theme={theme} />
            </div>
        ))}
      </div>


      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-purple-600" size={24} />
          <h1 className="font-bold text-lg tracking-tight">AI Snapshot <span className="text-xs font-normal text-gray-500 ml-2">Compact</span></h1>
        </div>
        <div className="flex items-center space-x-3">
           {pages.length > 1 && (
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md flex items-center animate-pulse">
                    <Layers size={12} className="mr-1"/> 
                    自动切分: {pages.length} 页
                </span>
            )}
          <button 
            onClick={handleDownload}
            disabled={exporting}
            className={`flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all active:scale-95 ${exporting ? 'opacity-70 cursor-wait' : ''}`}
          >
            {exporting ? <span>处理中...</span> : <><Download size={16} /><span>保存图片</span></>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel */}
        <div className="w-1/3 min-w-[340px] max-w-[450px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto z-10 shadow-lg">
          <div className="p-5 border-b border-gray-100 space-y-6">
            
            {/* Theme */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                <Palette size={14} /> <span>主题风格</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Object.keys(THEMES).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCurrentTheme(key)}
                    className={`w-full h-10 rounded-full border-2 transition-all flex items-center justify-center ${currentTheme === key ? 'border-purple-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                    title={THEMES[key].name}
                  >
                    <div className={`w-full h-full rounded-full ${THEMES[key].bg.split(' ')[0]} ${key === 'minimal' ? 'border border-gray-200' : ''}`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                <Layout size={14} /> <span>画布尺寸</span>
              </label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {Object.keys(ASPECT_RATIOS).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center space-x-1 transition-all ${aspectRatio === ratio ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {ASPECT_RATIOS[ratio].icon}
                    <span>{ASPECT_RATIOS[ratio].name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Author */}
            <div>
               <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                <Type size={14} /> <span>底部署名</span>
              </label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={showAuthor} onChange={(e) => setShowAuthor(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500"/>
                <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-purple-500" disabled={!showAuthor}/>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-5">
            <div className="flex justify-between items-center mb-3">
                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Type size={14} /> <span>内容 (Markdown)</span>
                </label>
                <div className="flex space-x-2 text-[10px] text-gray-400">
                    <span className="flex items-center"><TableIcon size={10} className="mr-1"/>表格</span>
                    <span className="flex items-center"><Layers size={10} className="mr-1"/>自动分页</span>
                </div>
            </div>
            <textarea 
              className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴内容..."
            />
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-gray-200 overflow-y-auto p-8 flex items-start justify-center">
          
          <div ref={previewContainerRef} className="flex flex-col space-y-8 pb-20">
            {pages.map((pageBlocks, pageIndex) => (
                <div 
                  key={pageIndex}
                  className={`
                    export-card 
                    relative overflow-hidden
                    transition-all duration-300
                    ${theme.bg} 
                  `}
                  style={{
                      width: currentRatio.width,
                      height: currentRatio.height || 'auto', 
                      minHeight: currentRatio.height ? undefined : 500
                  }}
                >
                  {/* Decorations */}
                  {theme.decoration === 'glass' && (
                     <>
                       <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
                       <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                       <div className="absolute -bottom-8 left-20 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                     </>
                  )}
                   {theme.decoration === 'texture' && (
                     <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
                  )}

                  <div className={`h-full flex flex-col relative z-10 ${theme.padding}`}>
                    <div className={`flex-1 ${theme.containerBg} ${theme.shadow} rounded-2xl p-6 md:p-8 flex flex-col`}>
                      
                      {/* Blocks Content */}
                      <div className={`flex-1 ${theme.textColor} overflow-hidden`}>
                        <div className={`space-y-3 ${theme.fontBody}`}>
                            {pageBlocks.map(block => (
                                <BlockRenderer key={block.id} block={block} theme={theme} />
                            ))}
                        </div>
                      </div>

                      {/* Footer */}
                      {showAuthor && (
                        <div className={`mt-6 pt-4 border-t ${theme.name === '深空黑' || theme.name === '极光紫' ? 'border-white/10' : 'border-gray-200/60'} flex justify-between items-center`}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.name === '深空黑' || theme.name === '极光紫' ? 'bg-white/10' : 'bg-black/5'}`}>
                              <Sparkles size={14} className={theme.headingColor} />
                            </div>
                            <span className={`text-sm font-medium ${theme.headingColor}`}>{authorName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                             {pages.length > 1 && (
                                <span className={`text-xs opacity-50 ${theme.textColor} font-mono`}>
                                    {pageIndex + 1}/{pages.length}
                                </span>
                             )}
                             <span className={`text-xs opacity-50 ${theme.textColor} font-mono tracking-widest`}>AI SNAPSHOT</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
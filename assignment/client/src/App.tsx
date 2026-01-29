import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';

//  API Configuration 
const API_URL = 'https://janardhanpavan-mini-excalidraw-server.onrender.com/api/shapes';

// TYPE DEFINITIONS 
type Point = { x: number; y: number };
type Tool = 'selection' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'rotate';
type Action = 'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'editing';

interface Shape {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
}


const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 40;

// To get the canvas coordinates from a browser event using HTMLCanvasElement
const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>): Point => {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

// the center of a shape for rotation
const getShapeCenter = (shape: Shape): Point => {
  if (shape.type === 'circle') {
    return { x: shape.x, y: shape.y };
  }
  if (shape.type === 'text') {
    const { width, height } = getTextDimensions(shape);
    return {
      x: shape.x + width / 2,
      y: shape.y + height / 2,
    }
  }
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
};

// Rotates a point around a center But isnt working properly🥲
const rotatePoint = (point: Point, center: Point, angleDeg: number): Point => {
  const angleRad = angleDeg * (Math.PI / 180);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const nx = (cos * (point.x - center.x)) - (sin * (point.y - center.y)) + center.x;
  const ny = (sin * (point.x - center.x)) + (cos * (point.y - center.y)) + center.y;
  return { x: nx, y: ny };
};

const utilityContext = document.createElement('canvas').getContext('2d');

// To Measures the pixel width and height of a text shape
const getTextDimensions = (shape: Shape): { width: number; height: number } => {
  if (!utilityContext || !shape.content) return { width: 0, height: 0 };
  utilityContext.font = `${shape.fontSize || 16}px ${shape.fontFamily || 'Arial'}`;
  const metrics = utilityContext.measureText(shape.content);
  return { 
    width: metrics.width, 
    height: (metrics.actualBoundingBoxAscent || shape.fontSize || 16) + (metrics.actualBoundingBoxDescent || 0)
  };
};

// This component will give coordinates for all selection handles on a shape
const getHandleCoords = (shape: Shape): Record<Handle, Point> => {
  const center = getShapeCenter(shape);
  const angle = shape.rotation;
  let { x, y, width, height } = shape;

  if (shape.type === 'circle') {
    x = shape.x - shape.width; y = shape.y - shape.width;
    width = shape.width * 2; height = shape.width * 2;
  } else if (shape.type === 'text') {
    const dims = getTextDimensions(shape);
    width = dims.width; height = dims.height;
  }

  const tl = { x, y };
  const tr = { x: x + width, y };
  const bl = { x, y: y + height };
  const br = { x: x + width, y: y + height };
  const rotateHandle = { x: x + width / 2, y: y - ROTATION_HANDLE_OFFSET };
  
  return {
    tl: rotatePoint(tl, center, angle),
    tr: rotatePoint(tr, center, angle),
    bl: rotatePoint(bl, center, angle),
    br: rotatePoint(br, center, angle),
    rotate: rotatePoint(rotateHandle, center, angle),
  };
};

// To Check if the point is inside a small handle box or not

const isPointOverHandle = (point: Point, handle: Point): boolean => {
  const half = HANDLE_SIZE / 2;
  return (
    point.x >= handle.x - half && point.x <= handle.x + half &&
    point.y >= handle.y - half && point.y <= handle.y + half
  );
};

// Finds which handle, if any, is at a given point

const getHandleAtPosition = (point: Point, shape: Shape): Handle | null => {
  if (shape.type === 'circle') {
     const coords = getHandleCoords(shape);
     if (isPointOverHandle(point, coords.tr)) return 'br'; 
     return null;
  }
  if (shape.type === 'text') return null;

  const handles = getHandleCoords(shape);
  for (const [name, coord] of Object.entries(handles)) {
    if (isPointOverHandle(point, coord)) {
      return name as Handle;
    }
  }
  return null;
};

//  Finds which shape, if any, is at a given point
const getShapeAtPosition = (point: Point, shapes: Shape[]): Shape | null => {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    const center = getShapeCenter(shape);
    const localPoint = rotatePoint(point, center, -shape.rotation);

    if (shape.type === 'circle') {
      const dist = Math.sqrt(Math.pow(localPoint.x - shape.x, 2) + Math.pow(localPoint.y - shape.y, 2));
      if (dist <= shape.width) return shape;
    } else if (shape.type === 'text') {
      const dims = getTextDimensions(shape);
      if (
        localPoint.x >= shape.x &&
        localPoint.x <= shape.x + dims.width &&
        localPoint.y >= shape.y &&
        localPoint.y <= shape.y + dims.height
      ) {
        return shape;
      }
    } else {
      if (
        localPoint.x >= shape.x && localPoint.x <= shape.x + shape.width &&
        localPoint.y >= shape.y && localPoint.y <= shape.y + shape.height
      ) {
        return shape;
      }
    }
  }
  return null;
};

// To Draws a single shape on the canvas
const drawShape = (context: CanvasRenderingContext2D, shape: Shape, editingElementId: string | null) => {
  if (shape.id === editingElementId) return;

  context.save();
  const center = getShapeCenter(shape);
  context.translate(center.x, center.y);
  context.rotate(shape.rotation * (Math.PI / 180));
  context.translate(-center.x, -center.y);

  context.beginPath();
  switch (shape.type) {
    case 'text':
      context.font = `${shape.fontSize || 16}px ${shape.fontFamily || 'Arial'}`;
      context.fillStyle = shape.color || '#000000';
      context.textBaseline = 'top';
      context.fillText(shape.content || '', shape.x, shape.y);
      break;
    case 'rectangle':
      context.rect(shape.x, shape.y, shape.width, shape.height);
      context.stroke();
      break;
    case 'circle':
      context.arc(shape.x, shape.y, shape.width, 0, 2 * Math.PI);
      context.stroke();
      break;
    case 'line':
      context.moveTo(shape.x, shape.y);
      context.lineTo(shape.x + shape.width, shape.y + shape.height);
      context.stroke();
      break;
    case 'arrow':
      context.moveTo(shape.x, shape.y);
      context.lineTo(shape.x + shape.width, shape.y + shape.height);
      drawArrowhead(context, shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
      context.stroke();
      break;
  }
  context.restore();
};

const drawArrowhead = (context: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
  const headLength = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.moveTo(toX, toY);
  context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  context.moveTo(toX, toY);
  context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
};

// Draws the selection handles for a shape
const drawSelectionHandles = (context: CanvasRenderingContext2D, shape: Shape) => {
  if (shape.type === 'text') {
    const { width, height } = getTextDimensions(shape);
    const center = getShapeCenter(shape);
    context.save();
    context.translate(center.x, center.y);
    context.rotate(shape.rotation * (Math.PI / 180));
    context.translate(-center.x, -center.y);
    context.strokeStyle = 'blue';
    context.lineWidth = 1;
    context.setLineDash([4, 2]);
    context.strokeRect(shape.x, shape.y, width, height);
    context.setLineDash([]);
    context.restore();
    return;
  }

  const handles = getHandleCoords(shape);
  context.strokeStyle = 'blue';
  context.fillStyle = 'white';
  context.lineWidth = 1;

  for (const [name, coord] of Object.entries(handles)) {
    if (shape.type === 'circle' && name !== 'tr') continue;
    if (shape.type === 'circle' && name === 'rotate') continue;

    context.beginPath();
    context.rect(coord.x - HANDLE_SIZE / 2, coord.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    context.fill();
    context.stroke();
  }

  if (shape.type !== 'circle') {
    const boxCenter = rotatePoint({ x: shape.x + shape.width / 2, y: shape.y }, getShapeCenter(shape), shape.rotation);
    context.beginPath();
    context.moveTo(boxCenter.x, boxCenter.y);
    context.lineTo(handles.rotate.x, handles.rotate.y);
    context.stroke();
  }
};


// The ToolBar Icons( SelectionIcon, RectangleIcon, CircleIcon, LineIcon, arrowIcon, TextIcon)
const SelectionIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>);
const RectangleIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>);
const CircleIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>);
const LineIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"></line></svg>);
const ArrowIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>);
const TextIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>);

// MAIN APP COMPONENT Starts Here

const App: React.FC = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>('selection');
  const [action, setAction] = useState<Action>('none');
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [editingElement, setEditingElement] = useState<Shape | null>(null);
  
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState(16);

  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentHandle, setCurrentHandle] = useState<Handle | null>(null);
  const [originalShape, setOriginalShape] = useState<Shape | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null); // Ref for canvas container
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- API Functions ---
  
  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setShapes(data);
      } catch (error) { console.error('Failed to fetch shapes:', error); }
    };
    fetchShapes();
  }, []);

  const addShape = async (shape: Omit<Shape, 'id'>) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shape),
      });
      const newShape = await res.json();
      setShapes(prev => [...prev, newShape]);
      return newShape;
    } catch (error) {
      console.error('Failed to add shape:', error);
      return null;
    }
  };

  const updateShapeOnBackend = async (shape: Shape) => {
    setShapes(prev => prev.map(s => (s.id === shape.id ? shape : s)));
    if (selectedShape?.id === shape.id) setSelectedShape(shape);
    
    try {
      await fetch(`${API_URL}/${shape.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shape),
      });
    } catch (error) { console.error('Failed to update shape:', error); }
  };

  const deleteShape = async (id: string) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setShapes(prev => prev.filter(s => s.id !== id));
      setSelectedShape(null);
    } catch (error) { console.error('Failed to delete shape:', error); }
  };

  //  Drawing Logic Starts here 
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#000000';
    context.lineWidth = 2;

    shapes.forEach(shape => drawShape(context, shape, editingElement?.id || null));

    if (action === 'drawing' && currentShape) {
      drawShape(context, currentShape, null);
    }

    if (tool === 'selection' && selectedShape && !editingElement) {
      drawSelectionHandles(context, selectedShape);
    }
  }, [shapes, action, currentShape, selectedShape, tool, editingElement]);
  
  // Text Editing Logic Starts HEre 
  
  useEffect(() => {
    if (action === 'editing' && textareaRef.current && editingElement) {
      textareaRef.current.focus();
      textareaRef.current.value = editingElement.content || '';
      handleTextareaChange({ target: textareaRef.current } as any);
    }
  }, [action, editingElement]);

  const handleTextEditComplete = () => {
    if (editingElement) {
      const newContent = textareaRef.current?.value || '';
      if (editingElement.content !== newContent) {
        const updatedShape = { ...editingElement, content: newContent };
        updateShapeOnBackend(updatedShape);
      }
    }
    setAction('none');
    setEditingElement(null);
    setSelectedShape(null);
  };
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     if (!editingElement) return;
     const textarea = e.target;
     textarea.style.height = 'auto';
     textarea.style.height = `${textarea.scrollHeight}px`;
     const dims = getTextDimensions({...editingElement, content: textarea.value});
     textarea.style.width = `${Math.max(dims.width + 5, 50)}px`;
  };

  const getEditingTextareaStyle = (): React.CSSProperties => {
    if (!editingElement) return { display: 'none' };
    
    // To Calculate The position relative to the canvas container
    const canvas = canvasRef.current;
    if (!canvas) return { display: 'none' };
    const rect = canvas.getBoundingClientRect();
    
    const { x, y, rotation, color, fontSize, fontFamily } = editingElement;
    const { width, height } = getTextDimensions(editingElement);

    return {
      display: 'block',
      position: 'absolute',
      top: y + rect.top - rect.y, // Adjust for canvas position
      left: x + rect.left - rect.x, // Adjust for canvas position
      transform: `rotate(${rotation || 0}deg)`,
      transformOrigin: 'top left',
      font: `${fontSize || 16}px ${fontFamily || 'Arial'}`,
      color: color || '#000000',
      border: '1px dashed #888',
      padding: '0',
      margin: '0',
      overflow: 'hidden',
      resize: 'none',
      backgroundColor: 'transparent',
      lineHeight: 1,
      width: Math.max(width + 5, 50),
      height: height,
    };
  };
  
  // Event Handlers Starts here 

  const handleMouseDown = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (action === 'editing') {
       handleTextEditComplete();
       return;
    }
    
    const point = getCanvasPoint(event); // original mouse down position
    setStartPoint(point); 

    if (tool === 'text') {
      setAction('editing');
      const newTextShape: Omit<Shape, 'id'> = {
        type: 'text',
        x: point.x, y: point.y,
        width: 0, height: 0,
        rotation: 0,
        content: 'Text',
        color: currentTextColor,
        fontSize: currentFontSize,
        fontFamily: currentFontFamily,
      };
      const newShape = await addShape(newTextShape);
      if (newShape) {
        setEditingElement(newShape);
        setSelectedShape(newShape);
      }
      return;
    }

    if (tool === 'selection') {
      const shapeAtPos = getShapeAtPosition(point, shapes);
      setSelectedShape(shapeAtPos);

      if (shapeAtPos) {
        setOriginalShape(shapeAtPos); // Store for transforming
        const handle = getHandleAtPosition(point, shapeAtPos);
        if (handle) {
          setCurrentHandle(handle);
          setAction(handle === 'rotate' ? 'rotating' : 'resizing');
        } else {
          setAction('moving');
        }
      } else {
        setAction('none');
        setOriginalShape(null);
      }
    } else {
      setAction('drawing');
      const newShapeBase = {
        x: point.x, y: point.y,
        width: 0, height: 0,
        rotation: 0, type: tool,
      };
      setCurrentShape({ ...newShapeBase, id: 'temp' });
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (action === 'editing') return;
    
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    
    if (canvas) {
      if (tool === 'selection') {
        const cursorShape = getShapeAtPosition(point, shapes);
        if (selectedShape && !cursorShape) {
          const handle = getHandleAtPosition(point, selectedShape);
          canvas.style.cursor = handle ? (handle === 'rotate' ? 'rotatePoint' : 'crosshair') : 'default';
        } else if (cursorShape) {
           canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'default';
        }
      } else {
        canvas.style.cursor = getShapeAtPosition(point, shapes) ? 'move' : 'default';
      }
    }

    // Action Logic Starts here 

    if (action === 'drawing' && currentShape) {
      let updatedShape: Shape;
      if (currentShape.type === 'circle') {
        const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
        updatedShape = { ...currentShape, width: radius, height: radius };
      } else {
        const newX = point.x < startPoint.x ? point.x : startPoint.x;
        const newY = point.y < startPoint.y ? point.y : startPoint.y;
        const newWidth = Math.abs(point.x - startPoint.x);
        const newHeight = Math.abs(point.y - startPoint.y);
        
        if (currentShape.type === 'line' || currentShape.type === 'arrow') {
           updatedShape = { ...currentShape, width: point.x - startPoint.x, height: point.y - startPoint.y };
        } else {
           updatedShape = { ...currentShape, x: newX, y: newY, width: newWidth, height: newHeight };
        }
      }
      setCurrentShape(updatedShape);
    } else if (action === 'moving' && originalShape) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
      const updatedShape = { ...originalShape, x: originalShape.x + dx, y: originalShape.y + dy };// Apply delta to original shape position
      setShapes(prev => prev.map(s => (s.id === updatedShape.id ? updatedShape : s)));
      setSelectedShape(updatedShape);
    } else if (action === 'rotating' && selectedShape) {
      const center = getShapeCenter(selectedShape);
      const angle = Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI) + 90;
      const updatedShape = { ...selectedShape, rotation: angle };
      setShapes(prev => prev.map(s => (s.id === updatedShape.id ? updatedShape : s)));
      setSelectedShape(updatedShape);
    } else if (action === 'resizing' && originalShape && currentHandle) {
        let updatedShape = { ...originalShape };

        if (originalShape.type === 'circle') {
            const newRadius = Math.sqrt(Math.pow(point.x - originalShape.x, 2) + Math.pow(point.y - originalShape.y, 2));
            updatedShape.width = newRadius; updatedShape.height = newRadius;
        } else {
            const dx = point.x - startPoint.x;
            const dy = point.y - startPoint.y;
            const angleRad = originalShape.rotation * (Math.PI / 180);
            const cos = Math.cos(-angleRad);
            const sin = Math.sin(-angleRad);
            const localDx = (cos * dx) - (sin * dy);
            const localDy = (sin * dx) + (cos * dy);

           switch (currentHandle) {
             case 'br': 
               updatedShape.width = originalShape.width + localDx;
               updatedShape.height = originalShape.height + localDy;
               break;
             case 'bl':
               updatedShape.x = originalShape.x + localDx;
               updatedShape.width = originalShape.width - localDx;
               updatedShape.height = originalShape.height + localDy;
               break;
             case 'tr':
               updatedShape.y = originalShape.y + localDy;
               updatedShape.width = originalShape.width + localDx;
               updatedShape.height = originalShape.height - localDy;
               break;
             case 'tl':
               updatedShape.x = originalShape.x + localDx;
               updatedShape.y = originalShape.y + localDy;
               updatedShape.width = originalShape.width - localDx;
               updatedShape.height = originalShape.height - localDy;
               break;
           }
        }
        setShapes(prev => prev.map(s => (s.id === updatedShape.id ? updatedShape : s)));
        setSelectedShape(updatedShape);
    }
  };

  const handleMouseUp = async () => {
    if (action === 'drawing' && currentShape) {
      if (currentShape.width !== 0 || currentShape.height !== 0) {
        if (currentShape.type === 'rectangle') {
          currentShape.x = currentShape.width < 0 ? currentShape.x + currentShape.width : currentShape.x;
          currentShape.y = currentShape.height < 0 ? currentShape.y + currentShape.height : currentShape.y;
          currentShape.width = Math.abs(currentShape.width);
          currentShape.height = Math.abs(currentShape.height);
        }
        const { id, ...newShape } = currentShape;
        await addShape(newShape);
      }
    } 
    else if ((action === 'moving' || action === 'resizing' || action === 'rotating') && selectedShape) {
       if(action === 'resizing' && selectedShape.type === 'rectangle') {
          selectedShape.x = selectedShape.width < 0 ? selectedShape.x + selectedShape.width : selectedShape.x;
          selectedShape.y = selectedShape.height < 0 ? selectedShape.y + selectedShape.height : selectedShape.y;
          selectedShape.width = Math.abs(selectedShape.width);
          selectedShape.height = Math.abs(selectedShape.height);
       }
      await updateShapeOnBackend(selectedShape);
    }
    
    if (action !== 'editing') {
       setAction('none');
    }
    setCurrentShape(null);
    setCurrentHandle(null);
    setOriginalShape(null);
  };
  
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'selection') return;
    const point = getCanvasPoint(event);
    const shapeAtPos = getShapeAtPosition(point, shapes);
    if (shapeAtPos && shapeAtPos.type === 'text') {
      setAction('editing');
      setEditingElement(shapeAtPos);
      setSelectedShape(shapeAtPos);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedShape && action !== 'editing') {
        deleteShape(selectedShape.id);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedShape, action]);

  // Toolbar Component 
  const MainToolbar = () => {
    const showTextControls = tool === 'text' || (tool === 'selection' && selectedShape?.type === 'text');
    
    const displayColor = (tool === 'selection' && selectedShape?.type === 'text') ? selectedShape.color : currentTextColor;
    const displayFontSize = (tool === 'selection' && selectedShape?.type === 'text') ? selectedShape.fontSize : currentFontSize;
    const displayFontFamily = (tool === 'selection' && selectedShape?.type === 'text') ? selectedShape.fontFamily : currentFontFamily;

    const handleStyleChange = (prop: keyof Shape, value: any) => {
      if (tool === 'selection' && selectedShape?.type === 'text') {
        const updatedShape = { ...selectedShape, [prop]: value };
        updateShapeOnBackend(updatedShape);
      } 
      else if (tool === 'text') {
        if (prop === 'color') setCurrentTextColor(value);
        if (prop === 'fontSize') setCurrentFontSize(parseInt(value));
        if (prop === 'fontFamily') setCurrentFontFamily(value);
      }
    };

    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-md p-2 flex gap-2 border border-gray-200 z-10 items-center">
        <button className={`p-2 rounded-md ${tool === 'selection' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('selection')} title="Select"><SelectionIcon /></button>
        <button className={`p-2 rounded-md ${tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('rectangle')} title="Rectangle"><RectangleIcon /></button>
        <button className={`p-2 rounded-md ${tool === 'circle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('circle')} title="Circle"><CircleIcon /></button>
        <button className={`p-2 rounded-md ${tool === 'line' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('line')} title="Line"><LineIcon /></button>
        <button className={`p-2 rounded-md ${tool === 'arrow' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('arrow')} title="Arrow"><ArrowIcon /></button>
        <button className={`p-2 rounded-md ${tool === 'text' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`} onClick={() => setTool('text')} title="Text"><TextIcon /></button>
        
        {showTextControls && <div className="w-px h-6 bg-gray-300 mx-2"></div>}

        {showTextControls && (
          <>
            <select
              value={displayFontFamily || 'Arial'}
              onChange={e => handleStyleChange('fontFamily', e.target.value)}
              className="p-1 border rounded-md text-sm"
              title="Font family"
            >
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="monaco">Monaco</option>
            </select>
            <input
              type="color"
              value={displayColor || '#000000'}
              onChange={e => handleStyleChange('color', e.target.value)}
              className="w-8 h-8 p-0 border-none cursor-pointer rounded-md"
              title="Text color"
            />
            <input
              type="number"
              min="8"
              max="128"
              value={displayFontSize || 16}
              onChange={e => handleStyleChange('fontSize', parseInt(e.target.value))}
              className="w-16 p-1 border rounded-md text-sm"
              title="Font size"
            />
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-screen h-screen bg-gray-50 font-sans flex flex-col">
      <h1 className="text-xl font-bold text-center text-gray-800 py-3 flex-shrink-0">
        MINI-EXCALIDRAW
      </h1>
      <div 
        ref={canvasContainerRef} 
        className="relative flex-1 w-full pb-4 px-4"
      >
        <MainToolbar />
        <canvas
          ref={canvasRef}
          className="bg-white rounded-lg shadow-inner border border-gray-300 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
        <textarea
          ref={textareaRef}
          onBlur={handleTextEditComplete}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault();
               handleTextEditComplete();
            }
          }}
          onChange={handleTextareaChange}
          style={getEditingTextareaStyle()}
        />
      </div>
    </div>
  );
};

export default App;
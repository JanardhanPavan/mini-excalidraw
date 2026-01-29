import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = 4000;//Running the backend on the port 4000

app.use(cors());
app.use(express.json());

// In-memory database is used
let shapes = [];

//  GET Method for retriving the data.. "GET /api/shapes"
app.get('/api/shapes', (req, res) => {
  res.json(shapes);
});

// Post Method for Adding(Creating) new  data.. "POST /api/shapes"
app.post('/api/shapes', (req, res) => {
  const { 
    type, x, y, width, height, rotation, 
    content, color, fontSize, fontFamily 
  } = req.body;
  
  const newShape = {
    id: crypto.randomUUID(),// used to generate a random string
    type,
    x,
    y,
    width,
    height,
    rotation,
    content: content || null,
    color: color || '#000000',
    fontSize: fontSize || 16,
    fontFamily: fontFamily || 'Arial',
  };
  shapes.push(newShape);
  res.status(201).json(newShape);
});

// PUT Method is used to Update the data by id" PUT /api/shapes/:id "
app.put('/api/shapes/:id', (req, res) => {
  const { id } = req.params;
  const { 
    x, y, width, height, rotation, 
    content, color, fontSize, fontFamily 
  } = req.body;
  
  const shapeIndex = shapes.findIndex(s => s.id === id);
  if (shapeIndex === -1) {
    return res.status(404).json({ message: 'Shape not found' });
  }

  const updatedShape = {
    ...shapes[shapeIndex],
    x,
    y,
    width,
    height,
    rotation,
    ...(content !== undefined && { content }),
    ...(color !== undefined && { color }),
    ...(fontSize !== undefined && { fontSize }),
    ...(fontFamily !== undefined && { fontFamily }),
  }
  
  shapes[shapeIndex] = updatedShape;
  res.json(updatedShape);
});

// Delete Method is used to Delete the data By Id " DELETE /api/shapes/:id "
app.delete('/api/shapes/:id', (req, res) => {
  const { id } = req.params;
  shapes = shapes.filter(s => s.id !== id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
# 🧩 Mini Excalidraw - Take-Home Assignment

A simplified **whiteboard application** built as a **full-stack solution** with:

- 🖥️ **Frontend:** React + TypeScript  
- ⚙️ **Backend:** Node.js + Express  

It allows users to **create, edit, and manage** shapes such as rectangles, circles, lines, arrows, and text.

---

## 🚀 How to Run This Project (Locally)

You must run **two servers simultaneously** — one for the backend and one for the frontend — each in a separate terminal.

---

### 🧠 1. Backend Server

Navigate to the backend (server) folder:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Run the server:

```bash
node server.mjs
```

The backend will start at:  
👉 **http://localhost:4000**

---

### 🎨 2. Frontend Application

Open a new terminal and navigate to the frontend folder:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open your browser and go to:  
👉 **http://localhost:5173** (or the URL shown in your terminal)

---

## 📡 API Documentation

The backend exposes a **RESTful API** to manage shapes.  
All data is **stored in-memory** and will reset when the server restarts.

---

### **Endpoints**

---

### 🧾 `GET /api/shapes`

**Description:** Fetch all shapes.

**Response Example:**

```json
[
  {
    "id": "shape-uuid-1",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 50,
    "height": 50,
    "rotation": 0,
    "content": null,
    "color": "#000000",
    "fontSize": 16,
    "fontFamily": "Arial"
  },
  {
    "id": "shape-uuid-2",
    "type": "text",
    "x": 200,
    "y": 250,
    "width": 0,
    "height": 0,
    "rotation": 0,
    "content": "Hello",
    "color": "#ff0000",
    "fontSize": 32,
    "fontFamily": "Verdana"
  }
]
```

---

### 🪄 `POST /api/shapes`

**Description:** Create a new shape.

**Request Example:**

```json
{
  "type": "circle",
  "x": 150,
  "y": 150,
  "width": 30,
  "height": 30,
  "rotation": 0
}
```

**Response Example:**

```json
{
  "id": "shape-uuid-3",
  "type": "circle",
  "x": 150,
  "y": 150,
  "width": 30,
  "height": 30,
  "rotation": 0,
  "content": null,
  "color": "#000000",
  "fontSize": 16,
  "fontFamily": "Arial"
}
```

---

### ✏️ `PUT /api/shapes/:id`

**Description:** Update a specific shape (used for move, resize, rotate, or text update).

**Request Example:**

```json
{
  "id": "shape-uuid-2",
  "type": "text",
  "x": 210,
  "y": 255,
  "width": 0,
  "height": 0,
  "rotation": 0,
  "content": "Hello World",
  "color": "#0000ff",
  "fontSize": 32,
  "fontFamily": "Verdana"
}
```

**Response Example:**

```json
{
  "id": "shape-uuid-2",
  "type": "text",
  "x": 210,
  "y": 255,
  "width": 0,
  "height": 0,
  "rotation": 0,
  "content": "Hello World",
  "color": "#0000ff",
  "fontSize": 32,
  "fontFamily": "Verdana"
}
```

---

### 🗑️ `DELETE /api/shapes/:id`

**Description:** Delete a specific shape.

**Response:**  
`204 No Content`

---

## ⚙️ Assumptions Made

### 🧩 Project Structure
- The project is divided into **two main folders:**
  - `client` → React frontend  
  - `server` → Node.js backend  
- This follows a **monorepo-style** structure for simplicity and clarity.

---

### 🎨 UI/UX Assumptions

- A **Selection Tool** was added (standard in whiteboard apps) for selecting, moving, rotating, and resizing shapes.
- **Delete/Backspace keys** remove selected shapes.
- **Text editing** starts by double-clicking a text element with the selection tool.
- **Text styling toolbar** (font, size, color) appears:
  - When the **Text Tool** is active (for new text).
  - When a **text element** is selected (for editing).

---

### 🌐 API Design Notes

- The **PUT** endpoint replaces the entire shape object — the frontend sends the **full updated shape**.
- Shape IDs are generated on the server using:

  ```js
  crypto.randomUUID()
  ```

---

### 🧱 Data Model Details

| Shape Type | Description |
|-------------|--------------|
| **Circle** | `x` and `y` represent the **center**. `width` represents the **radius** (height is stored but not used). |
| **Text** | `x` and `y` represent the **top-left corner**. `width` and `height` are not used for rendering but are computed for selection. |
| **Line / Arrow** | `(x, y)` is the **start point**, `(x + width, y + height)` is the **end point**. `width` and `height` can be negative. |

---

### 🗄️ Data Persistence

- All data is stored **in-memory** on the Node.js server.  
- Data **resets** whenever the server restarts.  
- No external database is used (by design).

---

## 🧑‍💻 Author

Developed as a **Take-Home Assignment** — _Mini Excalidraw Project_  
Built with ❤️ using **React, TypeScript, Node.js, and Express.**
"# mini-excalidraw-server" 

---

## LINKS
client: https://sparkly-buttercream-b1ba91.netlify.app/
Server : https://janardhanpavan-mini-excalidraw-server.onrender.com/

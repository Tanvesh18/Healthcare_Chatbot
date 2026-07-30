# CuraLink AI - Healthcare Assistant

A modern, AI-powered healthcare assistant application that provides personalized medical guidance, symptom analysis, and nearby healthcare facility recommendations. Built with React, Node.js, and powered by Groq AI.

![Tech Stack](https://img.shields.io/badge/React-19.2.3-blue)
![Tech Stack](https://img.shields.io/badge/Node.js-Express-green)
![Tech Stack](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen)
![Tech Stack](https://img.shields.io/badge/Groq-AI-orange)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Usage](#-usage)
- [Development](#-development)

---

## ✨ Features

### 🤖 AI-Powered Healthcare Chat
- **Streaming Responses**: Real-time AI responses using Server-Sent Events (SSE)
- **Personalized Assistance**: Context-aware conversations based on user health profile
- **Symptom Analysis**: Get possible causes and home remedies (not medical diagnosis)
- **Markdown Support**: Rich text formatting for better readability

### 👤 User Management
- **Secure Authentication**: JWT-based authentication system
- **User Profiles**: Store and manage health information (age, height, weight)
- **Chat History**: Persistent conversation history per user
- **Session Management**: Secure token-based sessions

### 🗺️ Location Services
- **Nearby Doctors**: Find hospitals and clinics within 3km radius
- **Interactive Maps**: Visual representation using Leaflet maps
- **OpenStreetMap Integration**: Free, open-source location data

### 🎨 Modern UI/UX
- **Dark Theme**: Eye-friendly dark mode interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Sidebar Navigation**: Easy access to chat history and features
- **Real-time Typing Indicators**: Visual feedback during AI responses

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.3** - Modern UI library
- **React Router DOM** - Client-side routing
- **React Markdown** - Markdown rendering for AI responses
- **React Icons** - Icon library
- **Leaflet & React-Leaflet** - Interactive maps
- **CSS3** - Custom styling with CSS variables

### Backend
- **Node.js** - Runtime environment
- **Express 5.2.1** - Web framework
- **MongoDB & Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **Bcryptjs** - Password hashing
- **Groq SDK** - AI model integration
- **Node-fetch** - HTTP client for external APIs

### External Services
- **Groq AI** - LLM provider (Llama 3.3 70B)
- **OpenStreetMap Overpass API** - Location data
- **MongoDB Atlas/Cloud** - Database hosting

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   React App  │  │  React Router│  │  LocalStorage │    │
│  │   (Port 3000)│  │              │  │   (JWT Token) │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘    │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │
          │  HTTP/REST      │                 │
          │  + SSE Stream   │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼────────────┐
│              EXPRESS SERVER (Port 5000)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth Routes │  │  Chat Routes │  │Location Routes│  │
│  │  (JWT)       │  │  (Groq AI)   │  │ (Overpass API)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘  │
│         │                 │                 │            │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼────────────┐
│                    EXTERNAL SERVICES                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  MongoDB     │  │   Groq API   │  │ Overpass API  │  │
│  │  (Database)  │  │  (AI Model)  │  │  (Maps Data)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication Flow**
   ```
   User → Login/Signup → Backend → JWT Token → Frontend (localStorage)
   ```

2. **Chat Request Flow**
   ```
   User Input → Frontend → Backend (with JWT) → Groq API → 
   Streaming Response (SSE) → Frontend → Display
   ```

3. **Location Services Flow**
   ```
   User Location → Frontend → Backend → Overpass API → 
   Nearby Clinics → Frontend → Map Display
   ```

### Database Schema

```javascript
User {
  name: String
  email: String (unique)
  password: String (hashed)
  age: Number
  height: Number
  weight: Number
  chats: [{
    title: String
    messages: [{
      sender: String ("user" | "assistant")
      text: String
      time: Date
    }]
  }]
}
```

---

## 📁 Project Structure

```
curalink/
├── backend/
│   ├── middleware/
│   │   └── RequireAuth.js      # Authentication middleware
│   ├── models/
│   │   └── User.js              # User & Chat schema
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── chat.js              # Chat & AI endpoints
│   │   └── location.js          # Location services
│   ├── server.js                # Express server setup
│   ├── package.json
│   └── .env                     # Environment variables
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── auth/
│   │   │   ├── Login.js         # Login component
│   │   │   ├── Signup.js        # Signup component
│   │   │   └── Auth.css         # Auth styles
│   │   ├── components/
│   │   │   ├── ChatArea.js      # Main chat interface
│   │   │   ├── Sidebar.js       # Navigation sidebar
│   │   │   ├── HealthProfile.js # Health profile modal
│   │   │   └── NearbyDoctors.js # Map component
│   │   ├── App.js               # Main router
│   │   ├── App.css              # Global styles
│   │   ├── MainApp.js           # Main application component
│   │   └── index.js              # Entry point
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local or MongoDB Atlas)
- **Groq API Key** ([Get one here](https://console.groq.com/))
- **npm** or **yarn**

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd curalink
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# MongoDB Connection
MONGO_URI=your-mongo-uri

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Groq API Key
GROQ_API_KEY=your-groq-api-key-here

# Frontend origin for CORS
CLIENT_ORIGIN=http://localhost:3000

# Google Sign-In Web Client ID
GOOGLE_CLIENT_ID=your-google-web-client-id
```

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your-google-web-client-id
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ Yes |
| `GROQ_API_KEY` | Groq API key for AI models | ✅ Yes |

#### Frontend
No environment variables required for basic setup. API endpoints are hardcoded to `http://localhost:5000`.

For Google Sign-In, configure these variables:

Backend `.env`
```env
CLIENT_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-web-client-id
```

Frontend `.env`
```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your-google-web-client-id
```

Google setup steps:
1. Create a Google OAuth Web application credential in Google Cloud.
2. Add `http://localhost:3000` to Authorized JavaScript origins.
3. Use the same Web Client ID in both backend and frontend env files.
4. Restart both apps after updating environment variables.

### Groq Model Configuration

The current model is set to `llama-3.3-70b-versatile` in `backend/routes/chat.js`. 

To change the model, update line 92 in `backend/routes/chat.js`:
```javascript
model: "llama-3.3-70b-versatile"  // Change to your preferred model
```

Available models (check [Groq Documentation](https://console.groq.com/docs/models)):
- `llama-3.3-70b-versatile` (Recommended)
- `llama-3.1-8b-instant` (Faster, smaller)
- `mixtral-8x7b-32768` (Alternative)

---

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here"
}
```

#### `POST /api/auth/login`
Authenticate and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here"
}
```

#### `GET /api/auth/me`
Get current user information.

**Headers:**
```
Authorization: <jwt-token>
```

**Response:**
```json
{
  "_id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "height": 175,
  "weight": 70
}
```

#### `PUT /api/auth/profile`
Update user health profile.

**Headers:**
```
Authorization: <jwt-token>
```

**Request Body:**
```json
{
  "age": 30,
  "height": 175,
  "weight": 70
}
```

### Chat Endpoints

#### `POST /api/chat/`
Send a chat message and get AI response.

**Headers:**
```
Authorization: <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I have a headache"
    }
  ],
  "location": {
    "lat": 28.6139,
    "lng": 77.2090
  }
}
```

**Response:**
```json
{
  "text": "I understand you're experiencing a headache..."
}
```

#### `POST /api/chat/chat-stream`
Streaming chat endpoint (Server-Sent Events).

**Headers:**
```
Authorization: <jwt-token>
Content-Type: application/json
```

**Request Body:** Same as `/api/chat/`

**Response:** SSE stream with format:
```
data: Hello
data:  there
data: [DONE]
```

### Location Endpoints

#### `POST /api/location/nearby-doctors`
Find nearby hospitals and clinics.

**Request Body:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090
}
```

**Response:**
```json
[
  {
    "name": "City Hospital",
    "lat": 28.6140,
    "lng": 77.2091,
    "speciality": "general"
  }
]
```

---

## 💻 Usage

### Getting Started

1. **Sign Up**: Create a new account with your email and password
2. **Login**: Authenticate to access the main application
3. **Set Health Profile**: (Optional) Add your age, height, and weight for personalized responses
4. **Start Chatting**: Describe your symptoms and get AI-powered guidance

### Features Guide

#### Chat Interface
- Type your symptoms or health questions in the input field
- Press Enter or click Send to submit
- AI responses stream in real-time
- Use the copy button to copy responses
- Use the speaker button for text-to-speech

#### Sidebar
- **New Chat**: Start a fresh conversation
- **Search Chats**: Find previous conversations
- **Chat History**: Access your saved conversations
- **User Profile**: View and edit your health profile

#### Nearby Doctors
- Enable location services
- View nearby hospitals and clinics on an interactive map
- Click markers for more information

---

## 🔧 Development

### Running in Development Mode

```bash
# Backend (Terminal 1)
cd backend
npm start

# Frontend (Terminal 2)
cd frontend
npm start
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
# No build step needed, just ensure .env is configured
```

### Code Structure

- **Components**: Reusable React components in `frontend/src/components/`
- **Routes**: API endpoints in `backend/routes/`
- **Models**: Database schemas in `backend/models/`
- **Middleware**: Authentication middleware in `backend/middleware/`

### Adding New Features

1. **New API Endpoint**: Add route in `backend/routes/`
2. **New Component**: Create in `frontend/src/components/`
3. **New Route**: Add to `frontend/src/App.js`

---

## 🔒 Security Considerations

- ✅ Passwords are hashed using bcrypt
- ✅ JWT tokens for authentication
- ✅ CORS enabled for frontend-backend communication
- ✅ Environment variables for sensitive data
- ⚠️ **Note**: This is a demo project. For production:
  - Use HTTPS
  - Implement rate limiting
  - Add input validation and sanitization
  - Use secure cookie storage
  - Implement proper error handling

---

**Built with ❤️ for better healthcare accessibility**

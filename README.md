# LearnWise Backend

An AI-powered educational platform backend for Egyptian secondary school students, built with Fastify, Supabase (PostgreSQL), and pgvector for semantic search.

## 🚀 Features

- **Modular Fastify Backend** - Clean, extensible architecture
- **AI-Powered Search** - Vector similarity search using pgvector
- **RAG (Retrieval-Augmented Generation)** - AI-generated answers based on retrieved content
- **JWT Authentication** - Secure user authentication and authorization
- **OpenAPI Documentation** - Auto-generated API documentation with Swagger UI
- **Q&A Module** - Questions and answers with voting system
- **Tutorials Module** - Educational content with different media types
- **Exam Papers Module** - Past exam papers with search and download
- **Role-Based Access** - Students, teachers, and admin roles

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Fastify** - Fast web framework
- **Supabase** - PostgreSQL database with real-time features
- **pgvector** - Vector similarity search
- **OpenAI** - AI embeddings and text generation
- **JWT** - Authentication tokens
- **OpenAPI/Swagger** - API documentation

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account and project
- OpenAI API key
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd learnwise-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Vector Search Configuration
VECTOR_DIMENSION=1024
SIMILARITY_THRESHOLD=0.7
```

### 4. Database Setup

#### Supabase Setup

1. Create a new Supabase project
2. Enable the `pgvector` extension in your Supabase dashboard
3. Get your project URL and API keys from the settings

#### Run Database Migrations

```bash
npm run migrate
```

This will create all necessary tables and functions including:
- Users table with role-based access
- Questions table with vector embeddings
- Answers table
- Tutorials table with vector embeddings
- Exam papers table with vector embeddings
- Votes, notifications, and user activity tables
- Vector search functions and indexes

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Once the server is running, you can access:

- **API Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **API Root**: http://localhost:3000

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `POST /api/v1/auth/logout` - User logout

### Questions
- `POST /api/v1/questions` - Create new question
- `GET /api/v1/questions` - Get all questions with filters
- `GET /api/v1/questions/:id` - Get question by ID
- `POST /api/v1/questions/search` - Vector search questions
- `POST /api/v1/questions/:id/answers` - Add answer to question
- `POST /api/v1/questions/:id/vote` - Vote on question

### AI
- `POST /api/v1/ai/embedding` - Generate text embedding
- `POST /api/v1/ai/rag-answer` - Generate RAG answer
- `POST /api/v1/ai/vector-search` - Vector similarity search
- `POST /api/v1/ai/multi-search` - Search across multiple content types

## 🔍 Vector Search Features

### Semantic Search
The platform uses OpenAI embeddings and pgvector for semantic similarity search:

```javascript
// Search for similar questions
POST /api/v1/ai/vector-search
{
  "query": "How to solve quadratic equations?",
  "table": "questions",
  "limit": 5
}
```

### RAG (Retrieval-Augmented Generation)
Generate AI-powered answers based on retrieved content:

```javascript
// Generate RAG answer
POST /api/v1/ai/rag-answer
{
  "query": "What is the Pythagorean theorem?",
  "searchTypes": ["questions", "tutorials"],
  "maxResults": 5
}
```

## 🏗️ Project Structure

```
learnwise-backend/
├── config/
│   └── database.js          # Supabase configuration
├── modules/
│   ├── auth/
│   │   └── routes.js        # Authentication routes
│   ├── questions/
│   │   └── routes.js        # Q&A module routes
│   ├── tutorials/
│   │   └── routes.js        # Tutorials module routes
│   ├── exams/
│   │   └── routes.js        # Exam papers routes
│   └── ai/
│       └── routes.js        # AI and vector search routes
├── plugins/
│   └── auth.js              # Authentication plugin
├── schemas/
│   ├── auth.js              # Authentication schemas
│   ├── questions.js         # Questions schemas
│   ├── tutorials.js         # Tutorials schemas
│   ├── exams.js             # Exam schemas
│   └── ai.js                # AI schemas
├── scripts/
│   └── migrate.js           # Database migration script
├── utils/
│   └── ai.js                # AI utilities
├── index.js                 # Main server file
├── package.json
└── README.md
```

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **student** - Can ask questions, view content, vote
- **teacher** - Can create tutorials, answer questions, moderate content
- **admin** - Full access to all features and admin tools

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
JWT_SECRET=your_secure_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: support@learnwise.com

## 🔮 Roadmap

- [ ] Tutorials module implementation
- [ ] Exam papers module implementation
- [ ] Recommendation system
- [ ] Real-time notifications
- [ ] File upload functionality
- [ ] Admin dashboard endpoints
- [ ] Rate limiting
- [ ] Caching layer
- [ ] Analytics and reporting 
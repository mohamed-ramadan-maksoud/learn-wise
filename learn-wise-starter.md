# LearnWise Backend Specification

**Project:** LearnWise  
**Goal:** Build a modular, AI-powered backend for an education platform using Fastify, Supabase (PostgreSQL), OpenAPI docs, and pgvector for semantic search.

---

## Overview

LearnWise is an educational platform for Egyptian secondary school students. It provides AI-powered search, Q&A, tutorials, and past exam papers.  
This backend will expose all features via a modular Fastify server, using Supabase (PostgreSQL + pgvector) for storage and semantic search.

---

## Key Requirements

- Modular Fastify backend project
- PostgreSQL/Supabase for all data storage
- Use `pgvector` for vector/semantic search
    - For every question, tutorial, and exam post, generate and store an embedding (vector) in the database.
    - Implement vector search endpoints that, given a query, generate an embedding and retrieve semantically similar questions, tutorials, or exam posts using pgvector similarity.
    - Use vector search both for general search and to power Retrieval-Augmented Generation (RAG) for AI-generated answers.
- OpenAPI 3.0 docs auto-generated from routes
- JWT Auth (Supabase or custom)
- Well-structured API endpoints for all features
- Clear project structure for future extensibility

---

## Core Features & Modules

#### 1. **Authentication & User Management**
  - Register, login, logout (students, teachers, admins)
  - Roles and permissions

#### 2. **Q&A Module**
  - CRUD for questions and answers
  - Tagging/categorization
  - Upvotes/downvotes
  - **Vector search:** Store embeddings for questions and enable semantic similarity search via pgvector

#### 3. **Tutorials Module**
  - CRUD for tutorials (text, video, audio)
  - Tagging by subject, topic
  - **Vector search:** Store embeddings for tutorials and enable semantic similarity search via pgvector

#### 4. **Past Exam Papers Module**
  - CRUD for past exam papers (metadata + file)
  - Tagging by year, subject
  - **Vector search:** Store embeddings for exam papers and enable semantic similarity search via pgvector
  - Search and download

#### 5. **AI/RAG Integration**
  - Embedding generation for new content (callable API endpoint)
  - RAG: given a query, use vector search to retrieve relevant content (questions, tutorials, exam posts) and generate an answer using an LLM

#### 6. **Recommendation Module**
  - Personalized suggestions based on user activity

#### 7. **Admin Tools**
  - Content moderation endpoints
  - User management

---

## API Design & Documentation

- **All endpoints documented with OpenAPI (Swagger)**
- RESTful structure (`/api/v1/`)
- Example endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/questions`
  - `GET /api/v1/questions/search?query=...`
  - `POST /api/v1/ai/embedding`
  - `POST /api/v1/ai/rag-answer`

---

## Database

- **Supabase (PostgreSQL)**
- Use `pgvector` for embeddings
- Tables: users, questions, answers, tutorials, exam_papers, notifications, etc.
- Store vector embeddings for semantic search

---

## Project Structure
learnwise-backend
/modules
/auth
/questions
/tutorials
/exams
/ai
/recommendation
/admin
/plugins
/schemas
/utils
/config
index.js
openapi.yaml (generated)
README.md

---

## Tech Stack

- Node.js
- Fastify (modular plugins)
- Supabase (Postgres + auth + storage)
- pgvector
- OpenAPI (Swagger UI auto-generated)
- JWT for authentication

---

## Setup & Instructions

1. Connect to Supabase instance
2. Configure environment variables
3. Run migrations for DB & pgvector
4. Start Fastify server
5. Access OpenAPI docs at `/docs`

---

## Notes for AI

- Generate a modular Fastify project as described
- Ensure all routes have OpenAPI schema definitions
- Use Supabase JS client for DB/auth
- Use `pgvector` for vector operations on questions, tutorials, and exam papers
- Create clear, extensible code structure
- Seed DB with example data for testing

---

## Deliverables

- Complete backend codebase (as above)
- OpenAPI documentation
- Example `.env` file
- Setup instructions in README


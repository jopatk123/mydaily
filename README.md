# MyDaily - Personal Diary App

A simple, beautiful personal diary application built with FastAPI, React, and Docker.

## Features

- Write and save daily thoughts
- View past entries
- Clean, distraction-free interface
- Dockerized for easy deployment

## Tech Stack

- **Backend**: Python, FastAPI, SQLModel (SQLite)
- **Frontend**: React, Vite, Tailwind CSS
- **Deployment**: Docker Compose

## Getting Started

1.  **Prerequisites**: Ensure you have Docker and Docker Compose installed.

2.  **Run the application**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the app**:
    - Frontend: http://localhost:5173
    - Backend API Docs: http://localhost:8000/docs

## Development

- The `backend` folder contains the Python API.
- The `frontend` folder contains the React application.
- Changes to files will automatically reload the services (hot-reloading enabled).

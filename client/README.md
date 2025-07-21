# Wordle Arena

Wordle Arena is a real-time multiplayer word-guessing game inspired by Wordle. Built with React and Node.js.

Play here! -> [Wordle-Arena](https://wordle-arena-8bnxl1j8u-jeremy-tans-projects-790eaca5.vercel.app/)
---


<img width="1711" height="904" alt="image" src="https://github.com/user-attachments/assets/24b69f84-4075-4eec-a067-70335cec575d" />
<img src="https://github.com/user-attachments/assets/7e894204-0193-4290-8591-8b9f8f35c75b" alt="worldgif" style="width:200%; max-width:2000px; display:block; margin:auto;" />

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Communication:** WebSockets (via Socket.IO)
- **State Management:** Local storage (for persistent username)

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/)

### 1. Clone the repository

```
git clone https://github.com/YOUR_USERNAME/wordle-arena.git
cd wordle-arena
```
### 2. Install Dependencies
Open two terminals in the root directory, seperate do:
#### Backend:
```
cd server
npm install
```
#### Frontend:
```
cd client
npm install
```
### 3. Environment Variables
The frontend needs to know where to find the backend websocket server.
Create a file called .env inside your /client directory with the following line:
```
VITE_SOCKET_URL=http://localhost:4000
```
### 4. Running the app locally
Open two terminals in the root directory, seperate do:
#### Start the backend:
```
cd server
npm run dev
```
#### Start the frontend (in a new terminal):
```
cd client
npm start
```
- The frontend will be available at http://localhost:5173
- The backend will run at http://localhost:4000



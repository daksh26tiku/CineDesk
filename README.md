<h1 align="center">🎬 CineDesk</h1>
<div align="center">
  <strong>A full-stack cinema booking system built with the MERN stack — featuring real-time seat locking, concurrent booking prevention, JWT-secured APIs, and role-based access control.</strong>
  <br><br>
  <a href="https://cine-desk-client.vercel.app/">🌐 Live Demo</a>
</div>

---

## Table of Contents
* [Overview](#overview)
* [Key Technical Features](#key-technical-features)
* [Tech Stack](#tech-stack)
* [Roles & Permissions](#roles--permissions)
* [Guide](#guide)
* [How to Run the App](#how-to-run-the-app)

---

## Overview
CineDesk is a full-stack cinema ticket booking platform. Users can browse movies, view showtimes across cinemas, and book seats in real time. The system handles concurrent seat selection across multiple users using WebSockets and server-side atomic operations to guarantee no two users can ever book the same seat.

---

## Key Technical Features

### 🔒 Security
- **JWT Authentication** — Stateless auth via signed tokens; delivered as `httpOnly` cookies and `Authorization` headers
- **Role-Based Access Control (RBAC)** — `protect` + `authorize('admin')` middleware chain on all sensitive routes
- **CORS Whitelist** — Only explicitly listed frontend origins are allowed; all others are blocked
- **Helmet** — Sets 11+ HTTP security headers including Content Security Policy, X-Frame-Options, and HSTS
- **XSS Protection** — `xss-clean` sanitizes all `req.body`, `req.query`, and `req.params` input
- **NoSQL Injection Prevention** — `express-mongo-sanitize` strips MongoDB operators (`$`, `.`) from user input
- **Bcrypt** — Passwords hashed with 10 salt rounds via a pre-save Mongoose hook; never stored in plain text

### ⚡ Real-Time Concurrent Seat Booking
- **Socket.io Rooms** — Each showtime is a Socket.io room; all viewers share live seat state
- **In-Memory Seat Locking** — Seats are locked the moment a user clicks them, instantly visible to all others in the room
- **2-Minute TTL** — Seat locks expire automatically after 2 minutes; a countdown timer on the purchase page enforces this client-side
- **Server-Side Periodic Cleanup** — A `setInterval` running every 30 seconds sweeps expired locks server-side, even if the client crashes
- **Disconnect Grace Period** — When a user navigates to the purchase page (causing a socket disconnect), their locks are preserved for 15 seconds to allow reconnection, preventing false releases
- **Atomic DB Operation** — The final purchase uses MongoDB's `findOneAndUpdate` with `$nor` + `$elemMatch` — a single atomic check-and-write that makes double booking physically impossible at the database level, regardless of concurrency

### 🗄️ Database Design
- **Cascade Deletion** — Mongoose `pre('deleteOne')` hooks chain deletions automatically: Cinema → Theater → Showtime → User tickets
- **Integrity Constraints** — Unique indexes, required fields, enums, regex validators, and `select: false` on sensitive fields
- **`runValidators: true`** — Schema validators run on update operations, not just on document creation

### 🎥 TMDB Integration
- Movie details, ratings, taglines, and synopsis fetched live from The Movie Database API
- Auto-scrolling backdrop gallery, embedded YouTube trailer, and cast list shown on the showtime page

---

## Tech Stack

### Frontend
| Technology | Version |
|---|---|
| React | 18.2.0 |
| React Router Dom | 6.14.2 |
| React Hook Form | 7.45.4 |
| Tailwind CSS | 3.3.3 |
| Socket.io Client | 4.x |
| Axios | 1.x |
| Vite | 4.4.8 |

### Backend
| Technology | Version |
|---|---|
| Node.js | 20.x |
| Express | 4.18.2 |
| Mongoose | 7.4.2 |
| MongoDB | Atlas |
| Socket.io | 4.8.3 |
| jsonwebtoken | 9.0.1 |
| bcryptjs | 2.4.3 |
| helmet | 7.0.0 |
| express-mongo-sanitize | 2.2.0 |
| xss-clean | 0.1.4 |
| cors | 2.8.5 |

---

## Roles & Permissions

| Role | Permissions |
|---|---|
| 👀 **Viewer** (not logged in) | Browse movies, cinemas, schedules · View released showtime seats |
| 👤 **User** | All Viewer permissions · Purchase tickets · View own ticket history |
| 👑 **Admin** | All User permissions · Manage cinemas, theaters, movies, showtimes · View booked seat details · Manage user roles |

---

## Guide

### 👀 Viewer

<details>
<summary>Home Page</summary>

1. Select a movie
2. Select a date to view showtimes
3. Optionally filter by cinema
4. Click a showtime to view the seat map

</details>

<details>
<summary>Cinema Page</summary>

1. Select a cinema
2. Select a date to view its theaters and showtimes
3. Click a showtime to view seats

</details>

<details>
<summary>Schedule Page</summary>

1. Select a cinema
2. Select a date to view the full daily schedule per theater
3. Click a showtime to view seats

</details>

<details>
<summary>Showtime Page</summary>

- 🟩 **White** — available
- ⬛ **Gray** — booked
- 🟨 **Yellow (lock icon)** — locked by another user in real time
- 🟦 **Blue (check icon)** — selected by you

*Viewers are redirected to login if they click Purchase.*

</details>

---

### 👤 User

<details>
<summary>Register / Login</summary>

1. Fill in username, email, and password → click **Register**
2. Log in with username and password → click **Login**

</details>

<details>
<summary>Purchasing Tickets</summary>

1. On the showtime page, click available seats — they lock in real time for other users
2. A **2-minute countdown timer** starts on the purchase confirmation page
3. Click **Confirm Purchase** to complete the booking
4. If the timer expires, seats are automatically released and you are redirected

</details>

<details>
<summary>Ticket Page</summary>

View all your purchased tickets with movie name, cinema, theater number, and showtime.

</details>

---

### 👑 Admin

<details>
<summary>Creating an Admin Account</summary>

1. Register a new user account
2. In MongoDB Atlas, locate the user document and set `role: "admin"`
3. Once the first admin exists, they can promote other users via the User page

</details>

<details>
<summary>Cinema Management</summary>

- Add, rename, or delete cinemas
- Deleting a cinema cascades: all its theaters and their showtimes are deleted, and affected user tickets are removed automatically

</details>

<details>
<summary>Theater Management</summary>

- Add a theater by specifying the last row letter and number of columns
- Delete theaters (cascades to showtimes and tickets)

</details>

<details>
<summary>Showtime Management</summary>

- Add showtimes with optional daily repetition
- Release or unrelease showtimes (controls visibility to viewers)
- View details of all booked seats per showtime
- Delete showtimes (cascades to user tickets)

</details>

<details>
<summary>Movie Management</summary>

- Add movies with name, poster URL, and runtime
- Delete movies (cascades to all associated showtimes and tickets)

</details>

<details>
<summary>Search / Filter Page</summary>

- Filter and sort showtimes across all cinemas and dates
- Bulk release, unrelease, or delete showtimes

</details>

<details>
<summary>User Management</summary>

- View all users with their emails, roles, and purchased tickets
- Promote or demote users between `user` and `admin` roles
- Delete user accounts

</details>

---

## How to Run the App

**1. Clone the repository**
```bash
git clone [https://github.com/your-username/CineDesk.git](https://github.com/your-username/CineDesk.git)
cd CineDesk

**2. Create a `.env` file in `/server`**
```env
PORT=8080
DATABASE=<your MongoDB Atlas connection string>
JWT_SECRET=<any long random string>
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
NODE_ENV=development
```
**3. Create a `.env` file in `/client`**
```env
VITE_SERVER_URL=http://localhost:8080
```
**4. Start the server**
```bash
cd server
npm install
npm start
```
**5. Start the client**
```bash
cd client
npm install
npm run dev
```
The app will be available at `http://localhost:5173`.

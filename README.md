# Food Hunger Rescue Platform

## 📌 Project Overview
The **Food Hunger Rescue Platform** is a full-stack mobile application designed to bridge the gap between food surplus and food scarcity. It provides a real-time, location-based network connecting **Restaurants (Donors)** with extra food to **NGOs (Receivers)** in need. To physically move the food, the platform uses a crowdsourced fleet of **Volunteer Drivers**, creating a complete and sustainable supply-chain loop.

---

## 🏗️ Architecture & Tech Stack

The project follows a modern **Client-Server Architecture**, utilizing RESTful APIs for communication between the mobile device and the server.

### 📱 Frontend (Mobile Application)
* **Framework:** React Native (Managed by Expo)
* **Why we used it:** Allows building a single codebase that deploys natively to both Android and iOS devices.
* **Key Libraries:** 
  * `Axios` for handling HTTP API requests.
  * `React Navigation` for handling the complex role-based screen routing.
* **Maps & Routing:** Uses a custom `WebView` bridging **Leaflet.js** for high-performance map rendering without native crashes, alongside deep-linking to native Google Maps for turn-by-turn navigation.

### ⚙️ Backend (API Server)
* **Framework:** Python FastAPI
* **Why we used it:** FastAPI is highly performant and uses asynchronous programming (`async/await`), making it perfect for handling multiple simultaneous API requests from the mobile app without blocking the server.
* **Data Validation:** Uses `Pydantic` to ensure all data coming from the mobile app is strictly validated before touching the database.
* **Authentication:** Implements **JWT (JSON Web Tokens)** alongside Bcrypt password hashing to secure endpoints and authenticate users.

### 🗄️ Database
* **Database Engine:** PostgreSQL
* **Why we used it:** A robust relational database ideal for modeling the complex relationships between Users, Donations, and Delivery Requests.
* **ORM:** SQLAlchemy (Async) is used to map Python objects securely to the SQL database tables.

---

## 👥 Core Modules & Workflows

The application adjusts its entire feature set based on the registered role of the user (Role-Based Access Control).

### 1. The Donor Module (Restaurants/Event Organizers)
* **Function:** Upload available surplus food.
* **Process:** The user fills out a donation form, takes a photo of the food (which is converted and uploaded securely), and sets their location coordinates. 
* **State Management:** Donors can track their donation status from "Available" to "Claimed" and finally "Delivered".

### 2. The Receiver Module (NGOs/Orphanages)
* **Function:** Find and claim food in real-time.
* **Process:** NGOs view an interactive map displaying nearby active food donations (represented as map markers). They can select a donation to view food details, quantity, and expiration time before claiming it.

### 3. The Delivery Module (Volunteer Network)
* **Function:** Fulfill the physical delivery.
* **Process:** Volunteers access a live job board of claimed donations needing transport.
* **Feature:** Once a job is accepted, the Volunteer is presented with a **Live Tracker Interface**. This screen plots the route from the pickup location to the drop-off location, provides turn-by-turn navigation, and allows the driver to update the order status ("Picked Up" / "Delivered").

---

## ⭐ Key Technical Achievements (For Evaluation)
* **Secure Role-Based Routing:** A secure system where JWT tokens govern not just backend API access, but also dictate which navigation screens the mobile application actively renders.
* **Interactive Geolocation:** Seamless handling of device GPS coordinates, reverse-geocoding (converting coordinates to street addresses), and visual map plotting.
* **Image Payload Handling:** Processing camera hardware output into `Base64` data payloads to be transmitted smoothly over REST APIs.

---

## 💻 How To Run Locally

### 1. Database
Ensure a local PostgreSQL server is running on port `5432` with an empty database created named `food_db`.

### 2. Run the Backend API
```bash
cd backend
# Activate the python virtual environment
.\venv\Scripts\activate
# Install required libraries
pip install -r requirements.txt
# Start the Uvicorn ASGI server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Run the Frontend App
```bash
cd frontend
# Install Node dependencies
npm install
# Start the Expo development server
npm start
```
*Once running, simply scan the QR code in the terminal using the Expo Go application on your mobile device.*

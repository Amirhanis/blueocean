// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Train configuration
const train = {
  trainNumber: '12345',
  departureTime: '10:00 AM',
  arrivalTime: '2:00 PM',
  coaches: Array.from({ length: 6 }, (_, i) => ({
    coachNumber: i + 1,
    seats: Array.from({ length: 20 }, (_, j) => ({
      seatNumber: j + 1,
      status: 'vacant', // 'vacant', 'locked', or 'booked'
    })),
  })),
};

// Real-time seat updates
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send initial train data
  socket.emit('init', train);

  // Lock a seat
  socket.on('lockSeat', ({ coachNumber, seatNumber }) => {
    const coach = train.coaches.find((c) => c.coachNumber === coachNumber);
    const seat = coach.seats.find((s) => s.seatNumber === seatNumber);
    if (seat.status === 'vacant') {
      seat.status = 'locked';
      io.emit('updateSeat', { coachNumber, seatNumber, status: 'locked' });
    }
  });

  // Confirm booking
  socket.on('confirmSeat', ({ coachNumber, seatNumber }) => {
    const coach = train.coaches.find((c) => c.coachNumber === coachNumber);
    const seat = coach.seats.find((s) => s.seatNumber === seatNumber);
    if (seat.status === 'locked') {
      seat.status = 'booked';
      io.emit('updateSeat', { coachNumber, seatNumber, status: 'booked' });
    }
  });

  // Unlock a seat (on reselect or cancel)
  socket.on('unlockSeat', ({ coachNumber, seatNumber }) => {
    const coach = train.coaches.find((c) => c.coachNumber === coachNumber);
    const seat = coach.seats.find((s) => s.seatNumber === seatNumber);
    if (seat.status === 'locked') {
      seat.status = 'vacant';
      io.emit('updateSeat', { coachNumber, seatNumber, status: 'vacant' });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Serve booking summary
app.get('/summary', (req, res) => {
  const bookedSeats = train.coaches.flatMap((coach) =>
    coach.seats.filter((seat) => seat.status === 'booked').map((seat) => ({
      coachNumber: coach.coachNumber,
      seatNumber: seat.seatNumber,
    }))
  );

  res.json({
    trainNumber: train.trainNumber,
    departureTime: train.departureTime,
    arrivalTime: train.arrivalTime,
    totalAmount: bookedSeats.length * 20, // Assume RM20 per seat
    bookedSeats,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

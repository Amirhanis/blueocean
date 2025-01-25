import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const App = () => {
  const [train, setTrain] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [summary, setSummary] = useState(null);

  const fetchBookingSummary = async () => {
    try {
      const response = await fetch("http://localhost:3000/summary");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  useEffect(() => {
    // Receive initial train data
    socket.on("init", (data) => {
      setTrain(data);
    });

    // Update seat status in real time
    socket.on("updateSeat", ({ coachNumber, seatNumber, status }) => {
      setTrain((prev) => {
        const updatedCoaches = prev.coaches.map((coach) => {
          if (coach.coachNumber === coachNumber) {
            return {
              ...coach,
              seats: coach.seats.map((seat) =>
                seat.seatNumber === seatNumber ? { ...seat, status } : seat
              ),
            };
          }
          return coach;
        });
        return { ...prev, coaches: updatedCoaches };
      });
    });

    return () => {
      socket.off("init");
      socket.off("updateSeat");
    };
  }, []);

  const handleSelectSeat = (coachNumber, seatNumber, status) => {
    if (status === "vacant") {
      if (selectedSeat && selectedSeat.coachNumber === coachNumber && selectedSeat.seatNumber === seatNumber) {
        // Deselect the seat if it's already selected
        handleUnlockSeat();
      } else {
        // Select the new seat
        if (selectedSeat) {
          // Unlock the previously selected seat
          handleUnlockSeat();
        }
        socket.emit("lockSeat", { coachNumber, seatNumber });
        setSelectedSeat({ coachNumber, seatNumber });
      }
    }
  };

  const handleConfirmBooking = () => {
    if (selectedSeat) {
      socket.emit("confirmSeat", selectedSeat);
      setSelectedSeat(null);
    }
  };

  const handleUnlockSeat = () => {
    if (selectedSeat) {
      socket.emit("unlockSeat", selectedSeat);
      setSelectedSeat(null);
    }
  };

  if (!train) return <div>Loading...</div>;

  return (
    <div className="p-4 app-container">
      <h1 className="text-xl font-bold mb-4">Train Ticket Booking</h1>

      <div className="grid grid-cols-3 gap-4">
        {train.coaches.map((coach) => (
          <div key={coach.coachNumber} className="border p-2">
            <h2 className="text-lg font-semibold">Coach {coach.coachNumber}</h2>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {coach.seats.map((seat) => (
                <button
                  key={seat.seatNumber}
                  className={`p-2 rounded text-white ${
                    seat.status === "vacant"
                      ? "bg-green-500"
                      : seat.status === "locked"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  disabled={seat.status !== "vacant"}
                  onClick={() =>
                    handleSelectSeat(
                      coach.coachNumber,
                      seat.seatNumber,
                      seat.status
                    )
                  }
                >
                  {seat.seatNumber}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {selectedSeat && (
          <div>
            <p className="mb-2">
              Selected Seat: Coach {selectedSeat.coachNumber}, Seat{" "}
              {selectedSeat.seatNumber}
            </p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
              onClick={handleConfirmBooking}
            >
              Confirm Booking
            </button>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={handleUnlockSeat}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={fetchBookingSummary}
        >
          Get Booking Summary
        </button>
      </div>

      {summary && (
        <div className="mt-4 p-4 border rounded booking-summary">
          <h2 className="text-lg font-bold mb-2">Booking Summary</h2>
          <p>Train Number: {summary.trainNumber}</p>
          <p>Departure Time: {summary.departureTime}</p>
          <p>Arrival Time: {summary.arrivalTime}</p>
          <p>Total Amount: RM{summary.totalAmount}</p>
          <h3 className="text-md font-semibold mt-2">Booked Seats:</h3>
          <ul className="list-disc pl-5">
            {summary.bookedSeats.map((seat, index) => (
              <li key={index}>
                Coach {seat.coachNumber}, Seat {seat.seatNumber}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
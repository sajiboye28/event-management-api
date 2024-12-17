import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Paper 
} from '@mui/material';

function EventList() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events from backend
    const fetchEvents = async () => {
      try {
        const response = await axios.get('/api/events');
        setEvents(response.data);
      } catch (error) {
        console.error('Failed to fetch events', error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Upcoming Events
      </Typography>
      <Paper elevation={3}>
        <List>
          {events.map((event) => (
            <ListItem key={event.id}>
              <ListItemText 
                primary={event.title} 
                secondary={`Date: ${event.date}`} 
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default EventList;

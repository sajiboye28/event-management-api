import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';
import { Typography, Button, Grid, Paper, Chip } from '@mui/material';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { 
  AnimationPresets, 
  useScrollAnimations, 
  use3DCardHover 
} from '../utils/animations';

const EventDetails = ({ eventId }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState('not_registered');

  const cardHoverProps = use3DCardHover();
  const scrollAnimations = useScrollAnimations();
  const contentRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const fetchEventDetails = async () => {
      try {
        const response = await axios.get(`/api/events/${eventId}`);
        setEvent(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    if (contentRef.current) {
      scrollAnimations.animateOnScroll(contentRef);
    }
  }, [event]);

  const handleRegister = async () => {
    try {
      const response = await axios.post(`/api/events/${eventId}/register`);
      setRegistrationStatus('registered');
      // Trigger success animation
      gsap.to('.success-message', {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading-spinner" />;
  if (error) return <div className="error-message">{error}</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <motion.div
      initial={AnimationPresets.fadeIn.initial}
      animate={AnimationPresets.fadeIn.animate}
      transition={AnimationPresets.fadeIn.transition}
      className="event-details-container"
    >
      {/* Hero Section */}
      <motion.div 
        className="event-hero"
        style={{
          backgroundImage: `url(${event.coverImage})`,
          height: '400px',
          position: 'relative'
        }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="hero-content"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Typography variant="h2">{event.title}</Typography>
          <Typography variant="h5">
            {new Date(event.date).toLocaleDateString()}
          </Typography>
        </motion.div>
      </motion.div>

      <Grid container spacing={4} ref={contentRef}>
        {/* Event Information */}
        <Grid item xs={12} md={8}>
          <animated.div {...cardHoverProps} className="event-card">
            <Typography variant="h4" gutterBottom>About This Event</Typography>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Typography variant="body1">{event.description}</Typography>
            </motion.div>

            <motion.div 
              className="tags-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {event.tags.map((tag, index) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Chip label={tag} className="tag-chip" />
                </motion.div>
              ))}
            </motion.div>
          </animated.div>
        </Grid>

        {/* Registration and Location */}
        <Grid item xs={12} md={4}>
          <animated.div {...cardHoverProps} className="event-card">
            <Typography variant="h5" gutterBottom>Event Details</Typography>
            
            <motion.div
              className="registration-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Typography variant="h6">
                Available Spots: {event.capacity - event.participants.length}
              </Typography>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRegister}
                  disabled={registrationStatus === 'registered'}
                  fullWidth
                >
                  {registrationStatus === 'registered' ? 'Registered' : 'Register Now'}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="map-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Typography variant="h6" gutterBottom>Location</Typography>
              <div style={{ height: '300px', width: '100%' }}>
                <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    mapContainerStyle={{ height: '100%', width: '100%' }}
                    center={{
                      lat: event.location.coordinates[1],
                      lng: event.location.coordinates[0]
                    }}
                    zoom={15}
                  >
                    <Marker
                      position={{
                        lat: event.location.coordinates[1],
                        lng: event.location.coordinates[0]
                      }}
                    />
                  </GoogleMap>
                </LoadScript>
              </div>
              <Typography variant="body1" style={{ marginTop: '1rem' }}>
                {event.location.address}
              </Typography>
            </motion.div>
          </animated.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default EventDetails;

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, Typography, Grid } from '@mui/material';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axiosInstance from '../utils/axios';
import API_CONFIG from '../config/api.config';
import '../styles/Dashboard.css';

// Import custom animation utilities
import { 
  AnimationPresets, 
  useScrollAnimations, 
  use3DCardHover, 
  StaggeredList,
  PageTransition 
} from '../utils/animations';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });

  const scrollAnimations = useScrollAnimations();
  const cardHoverProps = use3DCardHover();
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eventsRes, statsRes, activitiesRes] = await Promise.all([
          axiosInstance.get(API_CONFIG.ENDPOINTS.EVENTS),
          axiosInstance.get(API_CONFIG.ENDPOINTS.ANALYTICS),
          axiosInstance.get(API_CONFIG.ENDPOINTS.ACTIVITY)
        ]);

        setEvents(eventsRes.data);
        setStats(statsRes.data);
        setActivities(activitiesRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Animation setup
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (sectionRef.current) {
      scrollAnimations.animateOnScroll(sectionRef);
    }

    cardRefs.current.forEach(ref => {
      if (ref) {
        gsap.fromTo(
          ref,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            scrollTrigger: {
              trigger: ref,
              start: 'top 80%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
    });
  }, []);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  return (
    <PageTransition>
      <motion.div 
        ref={sectionRef}
        initial={AnimationPresets.fadeIn.initial}
        animate={AnimationPresets.fadeIn.animate}
        transition={AnimationPresets.fadeIn.transition}
        className="dashboard-container"
      >
        <Container maxWidth="lg">
          <motion.h1 
            {...AnimationPresets.slideIn.left}
            className="dashboard-title"
          >
            Event Management Dashboard
          </motion.h1>

          {/* Statistics Section */}
          <div className="stats-container">
            {stats && Object.entries(stats).map(([key, value], index) => (
              <motion.div
                key={key}
                className="stat-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="stat-value">{value}</div>
                <div className="stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              </motion.div>
            ))}
          </div>

          <Grid container spacing={3}>
            {/* Upcoming Events Card */}
            <Grid item xs={12} md={4}>
              <animated.div
                ref={el => cardRefs.current[0] = el}
                {...cardHoverProps}
                className="event-card"
              >
                <motion.div 
                  whileHover={AnimationPresets.scale.hover}
                  whileTap={AnimationPresets.scale.tap}
                  className="event-card-content"
                >
                  <Typography variant="h6">Upcoming Events</Typography>
                  <div className="activity-feed">
                    {events.map(event => (
                      <motion.div
                        key={event._id}
                        className="activity-item"
                        whileHover={{ x: 10 }}
                      >
                        <Typography variant="subtitle1">{event.title}</Typography>
                        <Typography variant="body2">
                          {new Date(event.date).toLocaleDateString()}
                        </Typography>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </animated.div>
            </Grid>

            {/* Map Card */}
            <Grid item xs={12} md={4}>
              <animated.div
                ref={el => cardRefs.current[1] = el}
                {...cardHoverProps}
                className="event-card"
              >
                <motion.div 
                  whileHover={AnimationPresets.scale.hover}
                  whileTap={AnimationPresets.scale.tap}
                  className="event-card-content"
                >
                  <Typography variant="h6">Event Locations</Typography>
                  <div className="map-container">
                    <LoadScript googleMapsApiKey={API_CONFIG.MAPS_API_KEY}>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter}
                        zoom={12}
                      >
                        {events.map(event => (
                          <Marker
                            key={event._id}
                            position={{
                              lat: event.location.coordinates[1],
                              lng: event.location.coordinates[0]
                            }}
                            onClick={() => setMapCenter({
                              lat: event.location.coordinates[1],
                              lng: event.location.coordinates[0]
                            })}
                          />
                        ))}
                      </GoogleMap>
                    </LoadScript>
                  </div>
                </motion.div>
              </animated.div>
            </Grid>

            {/* Activity Feed Card */}
            <Grid item xs={12} md={4}>
              <animated.div
                ref={el => cardRefs.current[2] = el}
                {...cardHoverProps}
                className="event-card"
              >
                <motion.div 
                  whileHover={AnimationPresets.scale.hover}
                  whileTap={AnimationPresets.scale.tap}
                  className="event-card-content"
                >
                  <Typography variant="h6">Recent Activity</Typography>
                  <div className="activity-feed">
                    {activities.map(activity => (
                      <motion.div
                        key={activity._id}
                        className="activity-item"
                        whileHover={{ x: 10 }}
                      >
                        <Typography variant="body2">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption">
                          {new Date(activity.timestamp).toLocaleString()}
                        </Typography>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </animated.div>
            </Grid>
          </Grid>
        </Container>
      </motion.div>
    </PageTransition>
  );
};

export default Dashboard;

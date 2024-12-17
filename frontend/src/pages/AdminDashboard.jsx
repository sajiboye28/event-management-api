import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  LinearProgress, 
  Alert, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper
} from '@mui/material';
import { 
  Timeline, 
  TimelineItem, 
  TimelineSeparator, 
  TimelineConnector, 
  TimelineContent, 
  TimelineDot 
} from '@mui/lab';
import { 
  Security as SecurityIcon, 
  Warning as WarningIcon, 
  Error as ErrorIcon, 
  CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';
import io from 'socket.io-client';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    systemHealth: null,
    fraudDetection: null,
    securityReport: null,
    userStats: null,
    eventStats: null,
    realTimeAlerts: []
  });

  const [threatIntelligence, setThreatIntelligence] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);

  // Socket for real-time monitoring
  const [socket, setSocket] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        dashboardResponse, 
        threatResponse
      ] = await Promise.all([
        axios.get('/api/admin/dashboard'),
        axios.get('/api/admin/threat-intelligence')
      ]);

      setDashboardData(dashboardResponse.data);
      setThreatIntelligence(threatResponse.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }
  }, []);

  // Setup real-time socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      path: '/admin-monitoring',
      query: { 
        token: localStorage.getItem('adminToken') 
      }
    });

    newSocket.on('connect', () => {
      console.log('Real-time monitoring connected');
    });

    // Real-time performance metrics
    newSocket.on('performanceMetrics', (metrics) => {
      setPerformanceMetrics(prev => [
        ...prev.slice(-50), // Keep last 50 metrics
        metrics
      ]);
    });

    // Real-time security alerts
    newSocket.on('securityAlert', (alert) => {
      setDashboardData(prev => ({
        ...prev,
        realTimeAlerts: [
          ...prev.realTimeAlerts.slice(-10), // Keep last 10 alerts
          alert
        ]
      }));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  // Render system health section
  const renderSystemHealth = () => {
    const { systemHealth } = dashboardData;
    if (!systemHealth) return <LinearProgress />;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6">System Health</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography>CPU Usage: {systemHealth.cpu.usage}%</Typography>
              <Typography>Memory: {systemHealth.memory.usedPercentage.toFixed(2)}%</Typography>
            </Grid>
            <Grid item xs={8}>
              <LineChart width={400} height={200} data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" />
                <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" />
              </LineChart>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Render security alerts
  const renderSecurityAlerts = () => {
    const { realTimeAlerts } = dashboardData;
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Security Alerts</Typography>
          <Timeline>
            {realTimeAlerts.map((alert, index) => (
              <TimelineItem key={index}>
                <TimelineSeparator>
                  <TimelineDot 
                    color={
                      alert.severity === 'HIGH' ? 'error' : 
                      alert.severity === 'MEDIUM' ? 'warning' : 'info'
                    }
                  >
                    {alert.severity === 'HIGH' ? <ErrorIcon /> : 
                     alert.severity === 'MEDIUM' ? <WarningIcon /> : 
                     <CheckCircleIcon />}
                  </TimelineDot>
                  {index < realTimeAlerts.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    {alert.title}
                  </Typography>
                  <Typography>{alert.description}</Typography>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>
    );
  };

  // Render threat intelligence
  const renderThreatIntelligence = () => {
    if (!threatIntelligence) return <LinearProgress />;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Threat Intelligence</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Suggested Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {threatIntelligence.securityRecommendations.map((rec, index) => (
                  <TableRow key={index}>
                    <TableCell>{rec.type}</TableCell>
                    <TableCell>
                      <Alert 
                        severity={
                          rec.priority === 'HIGH' ? 'error' : 
                          rec.priority === 'MEDIUM' ? 'warning' : 'info'
                        }
                      >
                        {rec.priority}
                      </Alert>
                    </TableCell>
                    <TableCell>{rec.description}</TableCell>
                    <TableCell>{rec.suggestedAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        <SecurityIcon /> Admin Security Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderSystemHealth()}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderSecurityAlerts()}
        </Grid>
        <Grid item xs={12}>
          {renderThreatIntelligence()}
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;

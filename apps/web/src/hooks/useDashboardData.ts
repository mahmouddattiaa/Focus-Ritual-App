import { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';
import { AxiosError } from 'axios';
import { useLocation } from 'react-router-dom';

export const useDashboardData = () => {
  const { dispatch, refreshStats } = useApp();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      await refreshStats();
      try {
        const response = await api.get('/api/stats/getHabits');
        if (response.data && response.data.habits) {
          dispatch({ type: 'SET_HABITS', payload: response.data.habits });
        }
      } catch (error) {
        if ((error as AxiosError).response?.status !== 404) {
          console.error("Failed to fetch habits for dashboard:", error);
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    loadData();
  }, [dispatch, refreshStats, location.key]);
};
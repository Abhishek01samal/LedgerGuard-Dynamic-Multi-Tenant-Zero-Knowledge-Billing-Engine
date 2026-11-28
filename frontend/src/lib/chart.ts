import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

ChartJS.defaults.color = '#a3a3a3';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.1)';
ChartJS.defaults.font.family = 'IBM Plex Sans, system-ui, sans-serif';

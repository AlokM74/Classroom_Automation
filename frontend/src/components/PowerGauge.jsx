import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

const MAX_POWER = 300;

export default function PowerGauge({ total }) {
  const used = Math.min(total, MAX_POWER);
  const remaining = Math.max(MAX_POWER - used, 0);

  const percentage = Math.round((used / MAX_POWER) * 100);
  const gaugeColor =
    percentage < 40 ? '#6c63ff' : percentage < 75 ? '#f59e0b' : '#ef4444';

  const data = {
    datasets: [
      {
        data: [used, remaining],
        backgroundColor: [gaugeColor, '#ede9fe'],
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    rotation: -90,
    circumference: 180,
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 500 },
  };

  return (
    <div className="gauge-container">
      <h3 className="gauge-title">⚡ Total Power</h3>
      <div className="gauge-chart-wrap">
        <Doughnut data={data} options={options} />
        <div className="gauge-center">
          <div className="gauge-value" style={{ color: gaugeColor }}>
            {total}
          </div>
          <div className="gauge-unit">Watts</div>
          <div className="gauge-percent">{percentage}%</div>
        </div>
      </div>
      <div className="gauge-labels">
        <span>0 W</span>
        <span>{MAX_POWER} W</span>
      </div>
    </div>
  );
}

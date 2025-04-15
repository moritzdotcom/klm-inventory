import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type InventoryChartProps = {
  data: {
    date: string;
    stock: number;
  }[];
};

export default function InventoryChart({ data }: InventoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="stock"
          name="Bestand"
          stroke="var(--color-sky-600)"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

import {
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { ReactNode } from 'react';

type SelectInputProps<Value = unknown> = {
  label: string;
  value: Value;
  onChange: (e: SelectChangeEvent<Value>) => void;
  children: ReactNode;
};

export default function SelectInput({
  label,
  value,
  onChange,
  children,
}: SelectInputProps) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={onChange}>
        {children}
      </Select>
    </FormControl>
  );
}

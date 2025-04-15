import { Autocomplete, TextField } from '@mui/material';

type AutocompleteInputProps = {
  label: string;
  options: string[];
  value: string;
  handleChange: (value: string) => void;
};

export default function AutocompleteInput({
  label,
  options,
  value,
  handleChange,
}: AutocompleteInputProps) {
  const onChange = (event: React.SyntheticEvent, value: string) => {
    handleChange(value);
  };

  return (
    <Autocomplete
      className="w-full"
      freeSolo
      inputValue={value}
      onInputChange={onChange}
      options={options}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

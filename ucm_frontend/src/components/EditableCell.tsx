import { useRef } from 'react';
import { Input, Select, Tooltip } from 'antd';

const { Option } = Select;

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasOptions?: boolean;
  options?: string[];
  hasError?: boolean;
  hasWarning?: boolean;
  errorMessage?: string;
}

export default function EditableCell({
  value,
  onChange,
  placeholder,
  hasOptions,
  options,
  hasError,
  hasWarning,
  errorMessage
}: EditableCellProps) {
  const inputRef = useRef<any>(null);

  const cellContent = hasOptions ? (
    <Select
      ref={inputRef}
      value={value}
      onChange={onChange}
      style={{ width: '100%' }}
      allowClear
    >
      {options?.map(opt => (
        <Option key={opt} value={opt}>{opt}</Option>
      ))}
    </Select>
  ) : (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );

  if (hasError || hasWarning) {
    return (
      <Tooltip title={errorMessage}>
        <div style={{ border: '1px solid #ff4d4f', borderRadius: '4px', padding: '4px' }}>
          {cellContent}
        </div>
      </Tooltip>
    );
  }

  return cellContent;
}
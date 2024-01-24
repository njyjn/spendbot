import { Input, TableCell, TableCellProps } from "@nextui-org/react";

export default function TableCellEditable(props: {
  value: string;
  currentIndex: number;
  onChangeHook: any;
  index?: number;
  isRequired?: boolean;
}): JSX.Element {
  return (
    <>
      {props.currentIndex === props.index ? (
        <Input
          isRequired={props.isRequired}
          type="text"
          size="sm"
          defaultValue={props.value}
          variant="underlined"
          onChange={(event) => props.onChangeHook(event.target.value)}
        />
      ) : (
        props.value
      )}
    </>
  );
}

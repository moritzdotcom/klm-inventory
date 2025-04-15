import { Dialog, DialogProps, Slide, useMediaQuery } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useTheme } from '@mui/system';
import { forwardRef } from 'react';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export type BaseDialogProps = DialogProps & {
  showOverflow?: boolean;
  disableTransition?: boolean;
};

export default function BaseDialog({
  maxWidth,
  children,
  showOverflow,
  disableTransition,
  ...other
}: BaseDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down(maxWidth || 0));

  return (
    <Dialog
      fullWidth={Boolean(maxWidth)}
      fullScreen={fullScreen}
      maxWidth={maxWidth || 'sm'}
      slots={{
        transition: disableTransition ? undefined : Transition,
      }}
      slotProps={{
        paper: {
          style: {
            borderRadius: fullScreen ? 0 : 12,
            overflow: showOverflow ? 'visible' : 'scroll',
          },
        },
      }}
      sx={{
        backdropFilter: 'blur(8px)',
      }}
      {...other}
    >
      {children}
    </Dialog>
  );
}

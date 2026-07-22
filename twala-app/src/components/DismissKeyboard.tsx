import { Keyboard, TouchableWithoutFeedback, View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  children: React.ReactNode;
}

export default function DismissKeyboard({ children, style, ...props }: Props) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[{ flex: 1 }, style]} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
}

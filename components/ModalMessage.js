// components/ModalMessage.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';

const { height } = Dimensions.get('window');

/**
 * A reusable modal component for displaying messages to the user.
 * It slides up from the bottom and can automatically dismiss.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.isVisible - Controls the visibility of the modal.
 * @param {string} props.message - The message text to display.
 * @param {function} props.onDismiss - Callback function when the modal is dismissed.
 * @param {number} [props.duration=2000] - How long the message stays visible in milliseconds (0 for indefinite).
 */
const ModalMessage = ({ isVisible, message, onDismiss, duration = 2000 }) => {
  const slideAnim = useRef(new Animated.Value(height)).current; // Initial position off-screen at the bottom

  useEffect(() => {
    if (isVisible) {
      // Animate from bottom (height) to near top (60)
      Animated.timing(slideAnim, {
        toValue: height - 120, // Adjust this value to position the modal higher or lower
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (duration > 0) {
          // Auto-dismiss after duration
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: height, // Slide back down
              duration: 300,
              useNativeDriver: true,
            }).start(() => onDismiss && onDismiss());
          }, duration);
        }
      });
    } else {
      // If not visible, ensure it's off-screen
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim, duration, onDismiss]);

  if (!isVisible) {
    return null; // Don't render if not visible
  }

  return (
    <TouchableWithoutFeedback onPress={duration === 0 ? onDismiss : undefined}>
      <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000, // Ensure it's above other content
  },
  messageBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ModalMessage;
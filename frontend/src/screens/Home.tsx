import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@components/common/Button';
import { logger } from '@utils/logger';

const HomeScreen: React.FC = () => {
  const handlePress = () => {
    logger.debug('Button pressed from Home screen');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to TodoMaster</Text>
      <Text style={styles.subtitle}>Your personal task management app</Text>
      <View style={styles.buttonContainer}>
        <Button title="Get Started" onPress={handlePress} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '80%',
  },
});

export default HomeScreen;
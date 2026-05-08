import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

export default function OptionCard({
  icon,
  title,
  description,
  selected = false,
  onPress,
  style,
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      <View style={[styles.card, selected && styles.selectedCard]}>
        <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
          <Icon name={icon} size={24} color={selected ? '#E23744' : '#8E8E93'} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
  },
  selectedCard: {
    borderColor: '#E23744',
    backgroundColor: '#FFF0F2',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    marginRight: 16,
  },
  iconWrapSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 55, 68, 0.2)',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  titleSelected: {
    color: '#E23744',
  },
  description: {
    fontSize: 13,
    color: '#636366',
    marginTop: 2,
    lineHeight: 18,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { BASE_URL } from '../api/config';

type Event = {
  event_id: number;
  event_name: string;
  start_date: string;
  end_date: string;
  description: string;
};

export default function EventListScreen() {
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/events`)
      .then(res => res.json())
      .then(data => {
        setCreatedEvents(data.created_events);
        setJoinedEvents(data.joined_events);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <View>
      <Text>EventListScreen</Text>
      <FlatList
        data={createdEvents}
        keyExtractor={item => String(item.event_id)}
        renderItem={({ item }) => (
          <Text>{item.event_name}</Text>
        )}
      />      
    </View>
  
  );
}

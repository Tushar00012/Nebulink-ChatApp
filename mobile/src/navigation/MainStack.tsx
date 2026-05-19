import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types';
import ProfileHeader from '../components/ProfileHeader';
import ChatListScreen from '../screens/ChatListScreen';
import NewChatScreen from '../screens/NewChatScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Chats', headerRight: () => <ProfileHeader /> }}
      />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Chat' }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}

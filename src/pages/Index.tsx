import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'https://functions.poehali.dev/e20f23d8-fa84-4c22-b6be-3d3233a790dc';

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: 'owner' | 'user';
  display_name?: string;
  is_online: boolean;
  last_seen?: number;
  never_logged_in?: boolean;
};

type Message = {
  id: number;
  from_user_id: number;
  to_user_ids: number[];
  text: string;
  timestamp: number;
};

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showEmployeesDialog, setShowEmployeesDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [lastMessageId, setLastMessageId] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = new Audio('/notification.mp3');
    audioRef.current = audio;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
      loadMessages();
      
      const interval = setInterval(() => {
        fetchUpdates();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      });
    }
    playNotificationSound();
  };

  const fetchUpdates = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(
        `${API_URL}?action=updates&userId=${currentUser.id}&lastMessageId=${lastMessageId}`
      );
      const data = await response.json();
      
      if (data.users) {
        setUsers(data.users);
      }
      
      if (data.newMessages && data.newMessages.length > 0) {
        const newMsgs = data.newMessages;
        setMessages((prev) => [...prev, ...newMsgs]);
        
        const lastId = Math.max(...newMsgs.map((m: Message) => m.id));
        setLastMessageId(lastId);
        
        const hasNewIncomingMessages = newMsgs.some(
          (m: Message) => m.from_user_id !== currentUser.id
        );
        
        if (hasNewIncomingMessages) {
          showNotification('MyMail', 'Получено новое сообщение!');
        }
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}?action=users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(
        `${API_URL}?action=messages&userId=${currentUser.id}&since=0`
      );
      const data = await response.json();
      setMessages(data);
      
      if (data.length > 0) {
        const maxId = Math.max(...data.map((m: Message) => m.id));
        setLastMessageId(maxId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          timestamp: Date.now(),
        }),
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        toast({ title: 'Вход выполнен успешно!' });
      } else {
        toast({ title: 'Неверный email или пароль', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка подключения', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    
    try {
      await fetch(`${API_URL}?action=logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          timestamp: Date.now(),
        }),
      });
      
      setCurrentUser(null);
      setSelectedChat(null);
      setMessages([]);
      setUsers([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) return;
    
    try {
      const response = await fetch(`${API_URL}?action=create_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${newUser.email}@MyMail`,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          password: newUser.password,
        }),
      });
      
      if (response.ok) {
        await loadUsers();
        setNewUser({ firstName: '', lastName: '', email: '', password: '' });
        setShowUserDialog(false);
        toast({ title: 'Сотрудник успешно создан!' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания сотрудника', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await fetch(`${API_URL}?action=delete_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      
      await loadUsers();
      if (selectedChat === id) {
        setSelectedChat(null);
      }
      toast({ title: 'Сотрудник удалён' });
    } catch (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser) return;
    
    try {
      const timestamp = Date.now();
      await fetch(`${API_URL}?action=send_message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserIds: [selectedChat],
          text: messageText,
          timestamp,
        }),
      });
      
      setMessageText('');
      await fetchUpdates();
    } catch (error) {
      toast({ title: 'Ошибка отправки сообщения', variant: 'destructive' });
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || selectedRecipients.length === 0 || !currentUser) return;
    
    try {
      const timestamp = Date.now();
      await fetch(`${API_URL}?action=send_message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserIds: selectedRecipients,
          text: broadcastMessage,
          timestamp,
        }),
      });
      
      setBroadcastMessage('');
      setSelectedRecipients([]);
      setShowBroadcastDialog(false);
      await fetchUpdates();
      toast({ title: 'Рассылка отправлена!' });
    } catch (error) {
      toast({ title: 'Ошибка отправки рассылки', variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_URL}?action=update_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          displayName: editDisplayName,
        }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setCurrentUser(updated);
        await loadUsers();
        setShowProfileDialog(false);
        toast({ title: 'Профиль обновлён!' });
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления профиля', variant: 'destructive' });
    }
  };

  const getChatMessages = (userId: number) => {
    if (!currentUser) return [];
    return messages.filter(
      (m) =>
        (m.from_user_id === currentUser.id && m.to_user_ids.includes(userId)) ||
        (m.from_user_id === userId && m.to_user_ids.includes(currentUser.id))
    );
  };

  const getOtherUsers = () => {
    if (!currentUser) return [];
    return users.filter((u) => u.id !== currentUser.id);
  };

  const formatMoscowTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const moscowOffset = 3 * 60 * 60 * 1000;
    const date = new Date(timestamp + moscowOffset);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getStatusText = (user: User) => {
    if (user.never_logged_in) {
      return 'Зарегистрирован, не авторизован';
    }
    if (user.is_online) {
      return 'В сети';
    }
    if (user.last_seen) {
      const moscowTime = formatMoscowTime(user.last_seen);
      return `Был(а) в сети в ${moscowTime} МСК`;
    }
    return 'Не в сети';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8 shadow-2xl border-border animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
              <Icon name="Mail" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">MyMail</h1>
            <p className="text-muted-foreground mt-2">Корпоративная почта</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Email</Label>
              <Input
                placeholder="email@MyMail"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1 bg-card border-input"
              />
            </div>
            <div>
              <Label className="text-foreground">Пароль</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 bg-card border-input"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" size="lg">
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="w-full md:w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser.first_name[0]}
                {currentUser.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{currentUser.display_name || `${currentUser.first_name} ${currentUser.last_name}`}</p>
              <p className="text-xs opacity-70">{currentUser.email}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setEditDisplayName(currentUser.display_name || '')}>
                  <Icon name="Settings" size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Настройки профиля</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Отображаемое имя</Label>
                    <Input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Как вас называть?"
                      className="mt-1 bg-background border-input"
                    />
                  </div>
                  <Button onClick={handleUpdateProfile} className="w-full">
                    Сохранить
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>

        {currentUser.role === 'owner' && (
          <div className="p-3 border-b border-border space-y-2">
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  Добавить сотрудника
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Новый сотрудник</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Имя</Label>
                    <Input
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="mt-1 bg-background border-input"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Фамилия</Label>
                    <Input
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="mt-1 bg-background border-input"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Email (без @MyMail)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="ivanov"
                        className="bg-background border-input"
                      />
                      <span className="text-muted-foreground whitespace-nowrap">@MyMail</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">Пароль</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="mt-1 bg-background border-input"
                    />
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" size="sm">
                  <Icon name="Send" size={16} className="mr-2" />
                  Рассылка
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Создать рассылку</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Получатели</Label>
                    <ScrollArea className="h-40 border border-border rounded-md p-3 mt-1 bg-background">
                      {getOtherUsers().map((user) => (
                        <div key={user.id} className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={selectedRecipients.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecipients([...selectedRecipients, user.id]);
                              } else {
                                setSelectedRecipients(selectedRecipients.filter((id) => id !== user.id));
                              }
                            }}
                          />
                          <span className="text-sm text-foreground">{user.first_name} {user.last_name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRecipients(getOtherUsers().map((u) => u.id))}
                      className="mt-2"
                    >
                      Выбрать всех
                    </Button>
                  </div>
                  <div>
                    <Label className="text-foreground">Сообщение</Label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="mt-1 bg-background border-input"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleBroadcast} className="w-full">
                    Отправить рассылку
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showEmployeesDialog} onOpenChange={setShowEmployeesDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Icon name="Users" size={16} className="mr-2" />
                  Все сотрудники
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Управление сотрудниками</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Имя</TableHead>
                        <TableHead className="text-foreground">Email</TableHead>
                        <TableHead className="text-foreground">Пароль</TableHead>
                        <TableHead className="text-foreground">Статус</TableHead>
                        <TableHead className="text-foreground"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-border">
                          <TableCell className="text-foreground">
                            {user.display_name || `${user.first_name} ${user.last_name}`}
                            {user.role === 'owner' && (
                              <Badge variant="secondary" className="ml-2">
                                Владелец
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">{user.email}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {user.password}
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.is_online ? (
                              <Badge variant="default" className="bg-green-600">В сети</Badge>
                            ) : user.never_logged_in ? (
                              <Badge variant="outline">Не активирован</Badge>
                            ) : (
                              <Badge variant="secondary">Офлайн</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2">
            <p className="text-xs font-semibold text-muted-foreground px-3 py-2">Контакты</p>
            {getOtherUsers().map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedChat(user.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground group ${
                  selectedChat === user.id ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.first_name[0]}
                      {user.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.display_name || `${user.first_name} ${user.last_name}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getStatusText(user)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border bg-card flex items-center gap-3">
              {(() => {
                const chatUser = users.find((u) => u.id === selectedChat);
                return chatUser ? (
                  <>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {chatUser.first_name[0]}
                        {chatUser.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {chatUser.display_name || `${chatUser.first_name} ${chatUser.last_name}`}
                      </p>
                      <div className="flex items-center gap-1">
                        {chatUser.is_online ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">В сети</span>
                          </>
                        ) : chatUser.never_logged_in ? (
                          <span className="text-xs text-muted-foreground">Зарегистрирован, не авторизован</span>
                        ) : chatUser.last_seen ? (
                          <span className="text-xs text-muted-foreground">
                            Был(а) в сети в {formatMoscowTime(chatUser.last_seen)} МСК
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">не в сети</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}
            </div>

            <ScrollArea className="flex-1 p-4 bg-background">
              <div className="space-y-4">
                {getChatMessages(selectedChat).map((msg) => {
                  const isOwn = msg.from_user_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-card text-card-foreground border border-border rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="border-input">
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Написать сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-background border-input"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
            <div className="text-center">
              <Icon name="MessageSquare" size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">Выберите контакт для начала общения</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

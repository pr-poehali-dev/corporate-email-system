import { useState, useEffect } from 'react';
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

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'owner' | 'user';
  displayName?: string;
  isOnline: boolean;
};

type Message = {
  id: string;
  from: string;
  to: string[];
  text: string;
  files?: string[];
  timestamp: number;
};

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'boss@MyMail',
      firstName: 'Владелец',
      lastName: 'Системы',
      password: 'admin',
      role: 'owner',
      displayName: 'Босс',
      isOnline: true,
    },
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setUsers((prev) => [...prev]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    const user = users.find(
      (u) => u.email === loginEmail && u.password === loginPassword
    );
    if (user) {
      setCurrentUser({ ...user, isOnline: true });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isOnline: true } : u))
      );
    }
  };

  const handleCreateUser = () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) return;
    
    const user: User = {
      id: Date.now().toString(),
      ...newUser,
      email: `${newUser.email}@MyMail`,
      role: 'user',
      isOnline: false,
    };
    setUsers((prev) => [...prev, user]);
    setNewUser({ firstName: '', lastName: '', email: '', password: '' });
    setShowUserDialog(false);
  };

  const handleDeleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat || !currentUser) return;
    
    const message: Message = {
      id: Date.now().toString(),
      from: currentUser.id,
      to: [selectedChat],
      text: messageText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
    setMessageText('');
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim() || selectedRecipients.length === 0 || !currentUser) return;
    
    const message: Message = {
      id: Date.now().toString(),
      from: currentUser.id,
      to: selectedRecipients,
      text: broadcastMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
    setBroadcastMessage('');
    setSelectedRecipients([]);
    setShowBroadcastDialog(false);
  };

  const handleUpdateProfile = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, displayName: editDisplayName };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    setShowProfileDialog(false);
  };

  const getChatMessages = (userId: string) => {
    if (!currentUser) return [];
    return messages.filter(
      (m) =>
        (m.from === currentUser.id && m.to.includes(userId)) ||
        (m.from === userId && m.to.includes(currentUser.id))
    );
  };

  const getOtherUsers = () => {
    if (!currentUser) return [];
    return users.filter((u) => u.id !== currentUser.id);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md p-8 shadow-2xl animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
              <Icon name="Mail" size={40} />
            </div>
            <h1 className="text-3xl font-bold">MyMail</h1>
            <p className="text-muted-foreground mt-2">Корпоративная почта</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                placeholder="email@MyMail"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1"
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
      <div className="w-full md:w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b flex items-center justify-between bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser.firstName[0]}
                {currentUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`}</p>
              <p className="text-xs opacity-70">{currentUser.email}</p>
            </div>
          </div>
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setEditDisplayName(currentUser.displayName || '')}>
                <Icon name="Settings" size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Настройки профиля</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Отображаемое имя</Label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Как вас называть?"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleUpdateProfile} className="w-full">
                  Сохранить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {currentUser.role === 'owner' && (
          <div className="p-3 border-b space-y-2">
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  Добавить сотрудника
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый сотрудник</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Имя</Label>
                    <Input
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Фамилия</Label>
                    <Input
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email (без @MyMail)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="ivanov"
                      />
                      <span className="text-muted-foreground">@MyMail</span>
                    </div>
                  </div>
                  <div>
                    <Label>Пароль</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="mt-1"
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать рассылку</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Получатели</Label>
                    <ScrollArea className="h-40 border rounded-md p-3 mt-1">
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
                          <span className="text-sm">{user.firstName} {user.lastName}</span>
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
                    <Label>Сообщение</Label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleBroadcast} className="w-full">
                    Отправить рассылку
                  </Button>
                </div>
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
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground ${
                  selectedChat === user.id ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.displayName || `${user.firstName} ${user.lastName}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                {currentUser.role === 'owner' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id);
                    }}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-card flex items-center gap-3">
              {(() => {
                const chatUser = users.find((u) => u.id === selectedChat);
                return chatUser ? (
                  <>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {chatUser.firstName[0]}
                        {chatUser.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {chatUser.displayName || `${chatUser.firstName} ${chatUser.lastName}`}
                      </p>
                      <div className="flex items-center gap-1">
                        {chatUser.isOnline ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">онлайн</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">не в сети</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {getChatMessages(selectedChat).map((msg) => {
                  const isOwn = msg.from === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-card text-card-foreground border rounded-bl-none'
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

            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Написать сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
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

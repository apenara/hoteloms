import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const AuthMonitor = ({ hotelId }) => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);

  useEffect(() => {
    if (!hotelId) return;

    // Monitorear sesiones activas
    const sessionsRef = collection(db, 'hotels', hotelId, 'active_sessions');
    const activeSessionsQuery = query(
      sessionsRef,
      where('active', '==', true),
      orderBy('startedAt', 'desc')
    );

    // Monitorear últimos accesos
    const logsRef = collection(db, 'hotels', hotelId, 'access_logs');
    const lastLoginsQuery = query(
      logsRef,
      orderBy('timestamp', 'desc')
    );

    const unsubscribeSessions = onSnapshot(activeSessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate()
      }));
      setActiveSessions(sessions);
    });

    const unsubscribeLogs = onSnapshot(lastLoginsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setLastLogins(logs);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeLogs();
    };
  }, [hotelId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sesiones Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeSessions.map(session => (
              <div key={session.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="font-medium">{session.userName}</p>
                  <p className="text-sm text-gray-500">
                    Rol: {session.role} | Tipo: {session.accessType}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {session.startedAt?.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Accesos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lastLogins.slice(0, 5).map(log => (
              <div key={log.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="font-medium">{log.userName}</p>
                  <p className="text-sm text-gray-500">
                    {log.action} via {log.accessType}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {log.timestamp?.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthMonitor;
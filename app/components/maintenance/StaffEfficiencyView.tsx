import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

const StaffEfficiencyView = ({ staffMember, tasks }) => {
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => {
      const scheduledDate = new Date(t.scheduledFor.seconds * 1000);
      return scheduledDate < new Date() && t.status !== 'completed';
    }).length
  };

  const efficiency = stats.total ? (stats.completed / stats.total * 100) : 0;
  const avgCompletionTime = tasks
    .filter(t => t.status === 'completed' && t.completedAt && t.createdAt)
    .reduce((acc, t) => {
      return acc + (t.completedAt.seconds - t.createdAt.seconds) / 3600;
    }, 0) / stats.completed || 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold">Total</div>
            <div className="text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-green-600">Completadas</div>
            <div className="text-2xl">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-yellow-600">Pendientes</div>
            <div className="text-2xl">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="font-semibold text-red-600">Vencidas</div>
            <div className="text-2xl">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Eficiencia</div>
              <div className="text-2xl font-bold">
                <Badge className={
                  efficiency > 80 ? 'bg-green-100 text-green-800' :
                  efficiency > 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {efficiency.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tiempo Promedio</div>
              <div className="text-2xl font-bold">
                {avgCompletionTime.toFixed(1)}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tareas Asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
              <TabsTrigger value="overdue">Vencidas</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <TaskList tasks={tasks} />
            </TabsContent>
            <TabsContent value="pending">
              <TaskList tasks={tasks.filter(t => t.status === 'pending')} />
            </TabsContent>
            <TabsContent value="completed">
              <TaskList tasks={tasks.filter(t => t.status === 'completed')} />
            </TabsContent>
            <TabsContent value="overdue">
              <TaskList tasks={tasks.filter(t => {
                const scheduledDate = new Date(t.scheduledFor.seconds * 1000);
                return scheduledDate < new Date() && t.status !== 'completed';
              })} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const TaskList = ({ tasks }) => (
  <ScrollArea className="h-[400px]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ubicación</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>F. Programada</TableHead>
          <TableHead>F. Completada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map(task => (
          <TableRow key={task.id}>
            <TableCell>{task.location}</TableCell>
            <TableCell>{task.description}</TableCell>
            <TableCell>
              <StatusBadge task={task} />
            </TableCell>
            <TableCell>
              {new Date(task.scheduledFor.seconds * 1000).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {task.completedAt ? 
                new Date(task.completedAt.seconds * 1000).toLocaleDateString() : 
                '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

const StatusBadge = ({ task }) => {
  const isOverdue = () => {
    const scheduledDate = new Date(task.scheduledFor.seconds * 1000);
    return scheduledDate < new Date() && task.status !== 'completed';
  };

  const getStatusConfig = () => {
    if (task.status === 'completed') {
      return {
        label: 'Completada',
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />
      };
    }
    if (isOverdue()) {
      return {
        label: 'Vencida',
        className: 'bg-red-100 text-red-800',
        icon: <AlertCircle className="w-4 h-4" />
      };
    }
    return {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="w-4 h-4" />
    };
  };

  const config = getStatusConfig();

  return (
    <Badge className={config.className}>
      <div className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </div>
    </Badge>
  );
};

export default StaffEfficiencyView;
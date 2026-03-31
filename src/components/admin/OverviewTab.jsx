import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, CheckSquare, FileText, Gem, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

export default function OverviewTab({ users = [], workspaces = [], tasks = [], notes = [], currentUser }) {
    const totalUsers = users?.length || 0;
    const totalWorkspaces = workspaces?.length || 0;
    const totalTasks = tasks?.length || 0;
    const totalNotes = notes?.length || 0;

    const subscriptionData = users.reduce((acc, user) => {
        const plan = user.subscription_plan || 'free';
        const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
        const existing = acc.find(item => item.name === planName);
        if (existing) {
            existing.value += 1;
        } else {
            acc.push({ name: planName, value: 1 });
        }
        return acc;
    }, []);

    const activityData = [
        { name: 'Pengguna', total: totalUsers },
        { name: 'Workspace', total: totalWorkspaces },
        { name: 'Tugas', total: totalTasks },
        { name: 'Catatan', total: totalNotes },
    ];

    const myAssignedTasks = Array.isArray(tasks) ? tasks.filter(t => {
        const isMatch = String(t.assigned_to) === String(currentUser?.id) && t.status === 'todo';
        return isMatch;
    }) : [];

    return (
        <div className="space-y-6">
            {/* 🔔 MY ASSIGNED TASKS (PRIORITY) */}
            {myAssignedTasks.length > 0 && (
                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Briefcase className="w-5 h-5" />
                            Tugas Anda
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                {myAssignedTasks.length} Pending
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Anda memiliki {myAssignedTasks.length} tugas yang perlu diselesaikan. Cek menu "Tugas" untuk detailnya.
                        </div>
                        <div className="grid gap-2">
                            {myAssignedTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="p-2 bg-white dark:bg-gray-800 rounded border text-sm flex justify-between items-center">
                                    <span className="font-medium truncate">{task.title}</span>
                                    <span className="text-xs text-gray-500">{new Date(task.created_date).toLocaleDateString()}</span>
                                </div>
                            ))}
                            {myAssignedTasks.length > 3 && (
                                <div className="text-xs text-center text-blue-600 mt-1 font-medium">
                                    + {myAssignedTasks.length - 3} tugas lainnya
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Pengguna terdaftar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Workspace</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWorkspaces}</div>
                        <p className="text-xs text-muted-foreground">Workspace dibuat</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Tugas</CardTitle>
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <p className="text-xs text-muted-foreground">Tugas di semua workspace</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Catatan</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalNotes}</div>
                        <p className="text-xs text-muted-foreground">Catatan tersimpan</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5" />Aktivitas Sistem</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={activityData}>
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip wrapperClassName="!bg-background !border-border" />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gem className="w-5 h-5" />Distribusi Langganan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={subscriptionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {subscriptionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip wrapperClassName="!bg-background !border-border" />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
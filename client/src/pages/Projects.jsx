import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from "../utils/api";
import toast from 'react-hot-toast';
import { FolderPlus, Trash2, FolderOpen } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const isGlobalAdmin = user?.role === 'Admin';

  const fetchProjects = () => {
    API.get('/projects')
      .then((res) => setProjects(res.data))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await API.post('/projects', { name, description });
      toast.success('Project created');
      setName('');
      setDescription('');
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await API.delete(`/projects/${id}`);
      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const getRole = (project) => {
    const member = project.members.find(
      (m) => m.user._id === user.id || m.user._id === user._id
    );
    return member?.role || 'Member';
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <Skeleton variant="text" className="w-32 h-8" />
          <Skeleton variant="text" className="w-32 h-10 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isGlobalAdmin && (
          <Button onClick={() => setShowModal(true)}>
            <FolderPlus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Create Modal */}
      {isGlobalAdmin && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Project">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Project Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
            />
            <Input
              label="Description"
              textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>Create Project</Button>
            </div>
          </form>
        </Modal>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={isGlobalAdmin ? FolderPlus : FolderOpen}
          title={isGlobalAdmin ? 'No projects yet' : 'No projects assigned'}
          description={
            isGlobalAdmin
              ? 'Create your first project to start managing tasks with your team.'
              : 'You have not been added to any projects yet. Ask an admin to add you.'
          }
          actionLabel={isGlobalAdmin ? 'Create Project' : undefined}
          onAction={isGlobalAdmin ? () => setShowModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <Link key={project._id} to={`/projects/${project._id}`}>
              <Card
                hover
                className="p-5 h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate flex-1">
                    {project.name}
                  </h3>
                  <Badge variant="role" value={getRole(project)} className="ml-2 shrink-0" />
                </div>

                {project.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                  {/* Avatar stack */}
                  <div className="flex -space-x-2">
                    {project.members.slice(0, 3).map((m) => (
                      <Avatar key={m.user._id} name={m.user.name} size="sm" className="ring-2 ring-white dark:ring-slate-800" />
                    ))}
                    {project.members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-400 ring-2 ring-white dark:ring-slate-800">
                        +{project.members.length - 3}
                      </div>
                    )}
                  </div>

                  {getRole(project) === 'Admin' && (
                    <button
                      onClick={(e) => handleDelete(project._id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

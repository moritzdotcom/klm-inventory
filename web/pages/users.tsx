import { Session } from '@/hooks/useSession';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { ApiGetUsersResponse } from './api/users';
import { ApiGetInvitesResponse, ApiPostInviteResponse } from './api/invites';
import NewInviteDialog from '@/components/dialogs/newInvite';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Link from 'next/link';
import ErrorMessage from '@/components/utils/errorMessage';
import { Collapse, Divider, Skeleton, TextField } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Add } from '@mui/icons-material';

export default function UsersPage({ session }: { session: Session }) {
  const { user, update } = session;
  const [users, setUsers] = useState<ApiGetUsersResponse>();
  const [userData, setUserData] = useState({
    ...user,
    password: '',
    newPassword: '',
  });
  const [userDataError, setUserDataError] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [updateFormTouched, setUpdateFormTouched] = useState(false);
  const [updateFormDirty, setUpdateFormDirty] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const [invites, setInvites] = useState<ApiGetInvitesResponse>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleInviteSuccess = (invite: ApiPostInviteResponse) => {
    setInvites((i) => (i ? [...i, invite] : [invite]));
    setDialogOpen(false);
  };

  const handleDelteInvite = (inviteId: string) => {
    setInvites((invs) =>
      invs ? invs.filter((i) => i.id !== inviteId) : undefined
    );
  };

  const updateUserData = (key: keyof typeof userData, val: string) => {
    setUpdateFormTouched(true);
    setUserData((d) => ({ ...d, [key]: val }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    setUpdateFormDirty(true);
    setUpdateError('');
    if (validateInputs()) {
      try {
        await update(userData);
        setUpdateFormTouched(false);
        setUpdateFormDirty(false);
        setShowUpdateSuccess(true);
        setTimeout(() => {
          setShowUpdateSuccess(false);
        }, 6000);
      } catch (error) {
        if (isAxiosError(error)) {
          setUpdateError(error.response?.data);
        }
        console.log(error);
      }
    }
    setLoading(false);
  };

  const validateInputs = () => {
    const errorObj = {
      name: '',
      email: '',
      password: '',
      newPassword: '',
    };
    if (!userData.name) errorObj.name = 'Name darf nicht leer sein';
    if (!userData.email) errorObj.email = 'Email darf nicht leer sein';
    if (userData.newPassword) {
      if (!userData.password)
        errorObj.password = 'Altes Passwort muss angegeben werden';
      if (userData.newPassword.length < 8)
        errorObj.newPassword = 'Mindestens 8 Zeichen';
    }
    setUserDataError(errorObj);
    return !(
      errorObj.name ||
      errorObj.email ||
      errorObj.password ||
      errorObj.newPassword
    );
  };

  useEffect(() => {
    axios('/api/users').then(({ data }) => setUsers(data));
    axios('/api/invites').then(({ data }) => setInvites(data));
  }, []);

  useEffect(() => {
    if (!user) return;
    setUserData({
      ...user,
      password: '',
      newPassword: '',
    });
  }, [user]);

  useEffect(() => {
    if (!updateFormDirty) return;
    validateInputs();
  }, [userData]);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          <h3 className="w-full text-3xl text-center text-sky-700">Benutzer</h3>
          <p className="invisible">Zurück</p>
        </div>
      </header>
      <div className="px-3">
        <div className="flex flex-col mt-8">
          <Divider className="text-gray-600">Profil bearbeiten</Divider>
          <div className="mt-5">
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              autoComplete="name"
              type="text"
              value={userData.name || ''}
              onChange={(e) => updateUserData('name', e.currentTarget.value)}
            />
            <ErrorMessage message={userDataError.name} />
          </div>
          <div className="mt-5">
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              required
              autoComplete="email"
              type="email"
              value={userData.email || ''}
              onChange={(e) => updateUserData('email', e.currentTarget.value)}
            />
            <ErrorMessage message={userDataError.email} />
          </div>
          <div className="mt-5">
            <TextField
              label="Passwort"
              variant="outlined"
              fullWidth
              autoComplete="password"
              type="password"
              value={userData.password}
              onChange={(e) =>
                updateUserData('password', e.currentTarget.value)
              }
            />
            <ErrorMessage message={userDataError.password} />
          </div>
          <div className="mt-5">
            <TextField
              label="Neues Passwort"
              variant="outlined"
              fullWidth
              type="password"
              value={userData.newPassword}
              onChange={(e) =>
                updateUserData('newPassword', e.currentTarget.value)
              }
            />
            <ErrorMessage message={userDataError.newPassword} />
          </div>
          <Collapse in={showUpdateSuccess}>
            <div className="w-full bg-emerald-600 text-white text-lg rounded-md px-5 py-3 flex items-center gap-3 mt-5">
              <CheckIcon />
              Profil gespeichert!
            </div>
          </Collapse>
          <ErrorMessage message={updateError} />
          <button
            disabled={loading || !updateFormTouched}
            onClick={handleUpdate}
            className="btn-primary disabled:opacity-80 mt-5"
          >
            {loading ? 'Lädt...' : 'Speichern'}
          </button>
        </div>
        <div className="flex flex-col gap-5 mt-5">
          <Divider className="text-gray-600">Registrierte Benutzer</Divider>
          {users ? (
            users.map((usr) => <UserCard key={usr.id} user={usr} />)
          ) : (
            <>
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-5 mt-5">
          <Divider className="text-gray-600">Offene Einladungen</Divider>
          <button
            className="btn-primary flex items-center justify-center gap-1"
            onClick={() => setDialogOpen(true)}
          >
            <Add fontSize="medium" /> Benutzer einladen
          </button>
          {invites ? (
            invites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onDelete={handleDelteInvite}
              />
            ))
          ) : (
            <>
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
              <Skeleton variant="rounded" sx={{ width: '100%', height: 64 }} />
            </>
          )}
        </div>
        <div className="mt-8 mb-10">
          <Divider />
          <Link
            href="/auth/logout"
            className="block mt-5 text-center w-full rounded-md px-5 py-3 text-red-700 border border-red-700"
          >
            Abmelden
          </Link>
        </div>
      </div>
      <NewInviteDialog
        maxWidth="sm"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}

function UserCard({ user }: { user: ApiGetUsersResponse[number] }) {
  return (
    <div className="rounded-md shadow px-5 py-2">
      <h6 className="text-lg">{user.name}</h6>
      <h5 className="text-sky-700 text-lg">{user.email}</h5>
    </div>
  );
}

function InviteCard({
  invite,
  onDelete,
}: {
  invite: ApiGetInvitesResponse[number];
  onDelete: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      await axios.delete('/api/invites', { data: { inviteId: invite.id } });
      onDelete(invite.id);
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };

  return (
    <div className="rounded-md shadow px-5 py-2 flex items-center justify-between">
      <h5 className="text-sky-700 text-lg">{invite.email}</h5>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-red-700"
      >
        <DeleteForeverIcon />
      </button>
    </div>
  );
}

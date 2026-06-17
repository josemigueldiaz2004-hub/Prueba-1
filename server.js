const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'workouts.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readWorkouts() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveWorkouts(workouts) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(workouts, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON no válido'));
      }
    });
    req.on('error', reject);
  });
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateWorkout(workout) {
  if (!workout || typeof workout !== 'object') return 'Entrenamiento inválido.';
  if (!workout.date) return 'La fecha es obligatoria.';
  if (!workout.name || !workout.name.trim()) return 'El nombre del entrenamiento es obligatorio.';
  if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) return 'Añade al menos un ejercicio.';

  for (const exercise of workout.exercises) {
    if (!exercise.name || !exercise.name.trim()) return 'Cada ejercicio necesita nombre.';
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return 'Cada ejercicio necesita al menos una serie.';
    for (const set of exercise.sets) {
      if (!Number.isFinite(Number(set.reps)) || Number(set.reps) <= 0) return 'Las repeticiones deben ser mayores que 0.';
      if (!Number.isFinite(Number(set.weight)) || Number(set.weight) < 0) return 'El peso no puede ser negativo.';
    }
  }
  return null;
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});

  const parts = pathname.split('/').filter(Boolean);
  const id = parts[2];

  if (pathname === '/api/workouts' && req.method === 'GET') {
    const workouts = readWorkouts().sort((a, b) => new Date(b.date) - new Date(a.date));
    return sendJson(res, 200, workouts);
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    const workouts = readWorkouts();
    const totalWorkouts = workouts.length;
    const totalSets = workouts.reduce((acc, workout) => acc + workout.exercises.reduce((eAcc, ex) => eAcc + ex.sets.length, 0), 0);
    const totalVolume = workouts.reduce((acc, workout) => acc + workout.exercises.reduce((eAcc, ex) => eAcc + ex.sets.reduce((sAcc, set) => sAcc + Number(set.reps) * Number(set.weight), 0), 0), 0);
    return sendJson(res, 200, { totalWorkouts, totalSets, totalVolume });
  }

  if (pathname === '/api/workouts' && req.method === 'POST') {
    const body = await readBody(req);
    const error = validateWorkout(body);
    if (error) return sendJson(res, 400, { error });

    const workouts = readWorkouts();
    const newWorkout = {
      id: createId(),
      date: body.date,
      name: body.name.trim(),
      notes: body.notes?.trim() || '',
      exercises: body.exercises.map(exercise => ({
        name: exercise.name.trim(),
        sets: exercise.sets.map(set => ({ reps: Number(set.reps), weight: Number(set.weight) }))
      }))
    };

    workouts.push(newWorkout);
    saveWorkouts(workouts);
    return sendJson(res, 201, newWorkout);
  }

  if (parts[0] === 'api' && parts[1] === 'workouts' && id && req.method === 'DELETE') {
    const workouts = readWorkouts();
    const next = workouts.filter(workout => workout.id !== id);
    if (next.length === workouts.length) return sendJson(res, 404, { error: 'Entrenamiento no encontrado.' });
    saveWorkouts(next);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Ruta no encontrada.' });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (parsedUrl.pathname.startsWith('/api/')) {
      return await handleApi(req, res, parsedUrl.pathname);
    }
    return serveStatic(req, res, parsedUrl.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Error interno del servidor.' });
  }
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`Entrenos App funcionando en http://localhost:${PORT}`);
});

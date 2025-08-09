import { log } from 'console';
import express from 'express';

const app = express();
app.listen(8080, () => log('Server is running on port 8080'));

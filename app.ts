import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
// @ts-ignore
import dotenv from 'dotenv';
import { Monitor } from './src/Monitor';
dotenv.config();

const PORT = process.env.PORT;
const app = express();
const monitor = new Monitor();

app.use(bodyParser());

app.use((error: Error, req: any, res: any, next: () => void) => {
  if (error instanceof SyntaxError) {
    res.status(400).send({ status: 400, errorCode: 'BAD_REQUEST' });
  } else {
    next();
  }
});

app.use(cors());

app.post('/activar', (req, res) => {
  monitor.activar();
  res.status(200);
  res.send({
    status: 200,
    message: 'Activado exitosamente',
  });
});

app.post('/desactivar', (req, res) => {
  monitor.desactivar();
  res.status(200);
  res.send({
    status: 200,
    message: 'Desactivado exitosamente',
  });
});

app.get('/estado', async (req, res) => {
  const estado = await monitor.estadoDeApis();

  res.status(200);
  res.send({
    status: 200,
    apis: estado,
  });
});

  /*
  ======================================================================================
  */

app.all('*', (req, res) => {
  res.status(404);
  res.send({
    status: 404,
    errorCode: 'RESOURCE_NOT_FOUND',
  });
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

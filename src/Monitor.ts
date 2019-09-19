import axios from 'axios';
import nodeSchedule, { Job } from 'node-schedule';

enum ESTADO {
    FUNCIONA = 'funciona',
    DEJO_DE_FUNCIONAR = 'dejo de funcionar',
}

interface API {
  url: string;
  estadoInterno: ESTADO;
  nombre: string;
}

export class Monitor {
  private activo = false;
  private schedule: Job = {} as Job;
  private apis: API[] = [];
  private ERRORES_ACEPTABLES = ['ECONNREFUSED', 'EHOSTUNREACH'];

  constructor() {
    this.apis.push({ url: process.env.LOGGER_URL as string, estadoInterno: ESTADO.FUNCIONA, nombre: 'Logger' });
    this.apis.push({ url: process.env.UNQFY_URL as string, estadoInterno: ESTADO.FUNCIONA, nombre: 'UNQfy' });
    this.apis.push({ url: process.env.GMAIL_URL as string, estadoInterno: ESTADO.FUNCIONA, nombre: 'Notificador Gmail' });
  }

  activar(): void {
    this.activo = true;
    const rule = new nodeSchedule.RecurrenceRule();
    rule.second = [1, 10, 20, 30, 40, 50];
    this.schedule = nodeSchedule.scheduleJob(rule, () => {
      this.monitorearApis();
    });
  }

  desactivar(): void {
    this.activo = false;
    this.schedule.cancel();
  }

  async monitorearApis(): Promise<void> {
    const promises: Promise<any>[] = [];
    this.apis.forEach((api) => {
      promises.push(this.monitorear(api));
    });
    await Promise.all(promises);
  }

  async monitorear(api: API): Promise<void> {
    const estaDeAlta = await this.estaDeAlta(api);
    if (estaDeAlta && api.estadoInterno === ESTADO.DEJO_DE_FUNCIONAR) {
      await axios.post(process.env.SLACK_URL as string, {
        text: `El servicio ${api.nombre} ha vuelto a funcionar`,
      });
      api.estadoInterno = ESTADO.FUNCIONA;
    } else if (!estaDeAlta && api.estadoInterno === ESTADO.FUNCIONA) {
      await axios.post(process.env.SLACK_URL as string, {
        text: `El servicio ${api.nombre} ha dejado de funcionar`,
      });
      api.estadoInterno = ESTADO.DEJO_DE_FUNCIONAR;
    }
  }

  async estaDeAlta(api: API): Promise<boolean> {
    return axios.get(api.url).then(async (result) => {
      return true;
    }).catch(async (error) => {
      return !this.ERRORES_ACEPTABLES.includes(error.code);
    });
  }

  async estadoDeApis(): Promise<{nombreApi: string, activa: boolean}[]> {
    const resultados: {nombreApi: string, activa: boolean}[] = [];
    const promesas: Promise<any>[] = [];
    this.apis.forEach((api: API) => {
      promesas.push(this.estaDeAlta(api).then((resultado: boolean) => {
        resultados.push({ nombreApi: api.nombre, activa: resultado });
      }));
    });
    await Promise.all(promesas);
    return resultados;
  }
}

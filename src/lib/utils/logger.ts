const isProduction = import.meta.env.PROD;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class LoggerService {
	private log(level: LogLevel, message: string, ...args: any[]) {
		if (isProduction && level === 'debug') return;

		// En producción, solo muestra Warn y Error
		if (isProduction && (level === 'info' || level === 'debug')) {
			return;
		}

		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

		switch (level) {
			case 'info':
				console.log(prefix, message, ...args);
				break;
			case 'warn':
				console.warn(prefix, message, ...args);
				break;
			case 'error':
				console.error(prefix, message, ...args);
				break;
			case 'debug':
				console.debug(prefix, message, ...args);
				break;
		}
	}

	info(message: string, ...args: any[]) {
		this.log('info', message, ...args);
	}

	warn(message: string, ...args: any[]) {
		this.log('warn', message, ...args);
	}

	// Actualizado para aceptar unknown
	error(err: unknown, ...args: any[]) {
		let message: string;

		if (err instanceof Error) {
			message = err.message;
			// Incluye el stack trace en desarrollo
			if (!isProduction && err.stack) {
				this.log('error', message, err.stack, ...args);
				return;
			}
		} else {
			message = String(err);
		}

		// En producción, no mostramos los argumentos adicionales para evitar fugas de información
		if (isProduction) {
			this.log('error', message);
		} else {
			this.log('error', message, ...args);
		}
	}

	debug(message: string, ...args: any[]) {
		this.log('debug', message, ...args);
	}
}

export const Logger = new LoggerService();

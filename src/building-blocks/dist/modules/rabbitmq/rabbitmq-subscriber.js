"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitmqSubscriber = void 0;
const common_1 = require("@nestjs/common");
const rabbitmq_connection_1 = require("./rabbitmq-connection");
const reflection_1 = require("../../utils/reflection");
const lodash_1 = require("lodash");
const serilization_1 = require("../../utils/serilization");
const open_telemetry_tracer_1 = require("../openTelemetry/open-telemetry-tracer");
let RabbitmqSubscriber = class RabbitmqSubscriber {
    constructor(rabbitMQConnection, openTelemetryTracer, type, handler) {
        this.rabbitMQConnection = rabbitMQConnection;
        this.openTelemetryTracer = openTelemetryTracer;
        this.type = type;
        this.handler = handler;
    }
    async onModuleInit() {
        try {
            const channel = await this.rabbitMQConnection.getChannel();
            const tracer = await this.openTelemetryTracer.createTracer('rabbitmq_subscriber_tracer');
            const exchangeName = (0, lodash_1.snakeCase)((0, reflection_1.getTypeName)(this.type));
            await channel.assertExchange(exchangeName, 'fanout', {
                durable: false
            });
            const q = await channel.assertQueue('', { exclusive: true });
            await channel.bindQueue(q.queue, exchangeName, '');
            common_1.Logger.log(`Waiting for messages with exchange name "${exchangeName}". To exit, press CTRL+C`);
            await channel.consume(q.queue, (message) => {
                var _a;
                if (message !== null) {
                    const span = tracer.startSpan(`receive_message_${exchangeName}`);
                    const messageContent = (_a = message === null || message === void 0 ? void 0 : message.content) === null || _a === void 0 ? void 0 : _a.toString();
                    const headers = message.properties.headers || {};
                    this.handler(q.queue, (0, serilization_1.deserializeObject)(messageContent));
                    common_1.Logger.log(`Message: ${messageContent} delivered to queue: ${q.queue} with exchange name ${exchangeName}`);
                    channel.ack(message);
                    span.setAttributes(headers);
                    span.end();
                }
            }, { noAck: false });
        }
        catch (error) {
            common_1.Logger.error(error);
            await this.rabbitMQConnection.closeChanel();
        }
    }
};
exports.RabbitmqSubscriber = RabbitmqSubscriber;
exports.RabbitmqSubscriber = RabbitmqSubscriber = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rabbitmq_connection_1.RabbitmqConnection,
        open_telemetry_tracer_1.OpenTelemetryTracer, Object, Function])
], RabbitmqSubscriber);
//# sourceMappingURL=rabbitmq-subscriber.js.map
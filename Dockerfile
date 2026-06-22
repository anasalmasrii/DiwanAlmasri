FROM node:20-alpine

# تعيين مجلد العمل
WORKDIR /app

# نسخ وبناء واجهة المستخدم (Client)
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# نسخ وتثبيت خادم الـ Node.js (Server)
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/

# إعداد المتغيرات البيئية
ENV NODE_ENV=production
ENV PORT=3000
# مسار قاعدة البيانات سيكون داخل المجلد الدائم المربوط بـ Fly
ENV DB_PATH=/data/database.sqlite

# إنشاء المجلد الذي سيتم ربطه بالقرص الصلب
RUN mkdir -p /data

# فتح المنفذ
EXPOSE 3000

# تشغيل الخادم
CMD ["node", "server/index.js"]

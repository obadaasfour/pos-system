# Backend Dockerfile - Laravel 11/12
FROM php:8.3-fpm-alpine

# Set working directory
WORKDIR /var/www/html

# Install system dependencies and PHP extensions
RUN apk add --no-cache --virtual .build-deps \
    postgresql-dev \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    libpng-dev \
    libxml2-dev \
    && apk add --no-cache \
    libpq \
    icu-libs \
    libzip \
    libpng \
    libxml2 \
    oniguruma \
    curl \
    git \
    zip \
    unzip \
    supervisor \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip intl \
    && apk del .build-deps

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Copy project files
COPY . .

# Copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Set permissions and create log directories
RUN chown -R www-data:www-data storage bootstrap/cache \
    && mkdir -p /var/log/supervisor

# Expose port 9000
EXPOSE 9000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

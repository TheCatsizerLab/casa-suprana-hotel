<?php
/**
 * Plugin Name: L'Ortu — Démo Beds24
 * Description: Démonstration WordPress de consultation du PMS Beds24 via l’API V2.
 * Version: 1.1.1
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: José Giovinazzo
 */

defined('ABSPATH') || exit;

final class Ortu_Beds24_Demo {
    private const SETTINGS = 'ortu_beds24_settings';
    private const CACHE = 'ortu_beds24_offers';
    private const NEXT_REQUEST = 'ortu_beds24_next_request';
    private const ENDPOINT = 'https://beds24.com/api/v2/inventory/rooms/offers';
    private const PAGE = 'ortu-beds24';
    private const MAX_ADVANCE = 120;
    private const MAX_NIGHTS = 21;

    public static function boot() {
        add_action('admin_menu', array(__CLASS__, 'admin_menu'));
        add_action('admin_post_ortu_beds24_save', array(__CLASS__, 'save'));
        add_shortcode('ortu_beds24', array(__CLASS__, 'shortcode'));
        add_shortcode('ortu_beds24_text', array(__CLASS__, 'copy_shortcode'));
        add_shortcode('ortu_beds24_languages', array(__CLASS__, 'languages_shortcode'));
        add_filter('language_attributes', array(__CLASS__, 'document_language'));
        add_filter('pre_get_document_title', array(__CLASS__, 'document_title'));
        add_filter('wpseo_title', array(__CLASS__, 'document_title'));
    }

    private static function language() {
        $language = isset($_GET['lang']) && is_string($_GET['lang']) ? $_GET['lang'] : 'fr';
        return in_array($language, array('fr', 'it', 'en'), true) ? $language : 'fr';
    }

    private static function text($key) {
        static $copy;
        if ($copy === null) {
            $copy = require __DIR__ . '/translations.php';
        }
        return $copy[self::language()][$key] ?? '';
    }

    public static function copy_shortcode($attributes) {
        $attributes = shortcode_atts(array('key' => ''), $attributes, 'ortu_beds24_text');
        return esc_html(self::text($attributes['key']));
    }

    public static function languages_shortcode() {
        $links = array();
        foreach (array('fr' => 'Français', 'it' => 'Italiano', 'en' => 'English') as $code => $label) {
            $current = self::language() === $code ? ' aria-current="true"' : '';
            $links[] = '<a href="' . esc_url(add_query_arg('lang', $code, get_permalink()))
                . '" hreflang="' . esc_attr($code) . '" lang="' . esc_attr($code) . '"'
                . $current . '>' . esc_html($label) . '</a>';
        }
        return '<nav class="oliviers-languages" aria-label="' . esc_attr(self::text('language'))
            . '">' . implode('', $links) . '</nav>';
    }

    public static function document_language($attributes) {
        $post = get_post();
        if (is_singular('page') && $post && has_shortcode($post->post_content, 'ortu_beds24')) {
            return preg_replace('/\blang="[^"]*"/', 'lang="' . self::language() . '"', $attributes);
        }
        return $attributes;
    }

    public static function document_title($title) {
        $post = get_post();
        if (is_singular('page') && $post && has_shortcode($post->post_content, 'ortu_beds24')) {
            return self::text('house_name') . ' - ' . get_bloginfo('name');
        }
        return $title;
    }

    public static function admin_menu() {
        add_options_page('Démo Beds24', 'Démo Beds24', 'manage_options', self::PAGE, array(__CLASS__, 'admin'));
    }

    private static function settings() {
        return wp_parse_args(get_option(self::SETTINGS, array()), array(
            'token' => '',
            'property_id' => 0,
            'room_id' => 0,
            'currency' => 'EUR',
        ));
    }

    private static function token($settings) {
        return defined('ORTU_BEDS24_TOKEN') ? trim((string) ORTU_BEDS24_TOKEN) : $settings['token'];
    }

    private static function read_post($name) {
        return isset($_POST[$name]) && is_string($_POST[$name])
            ? trim(wp_unslash($_POST[$name]))
            : '';
    }

    public static function save() {
        if (!current_user_can('manage_options')) {
            wp_die('Accès réservé à l’administration du site.', '', array('response' => 403));
        }
        check_admin_referer('ortu_beds24_save');

        $settings = self::settings();
        $new_token = self::read_post('ortu_beds24_token');
        $property_id = self::read_post('ortu_beds24_property');
        $room_id = self::read_post('ortu_beds24_room');
        $currency = strtoupper(self::read_post('ortu_beds24_currency'));

        if (!preg_match('/^[1-9][0-9]{0,8}$/D', $property_id)
            || !preg_match('/^[1-9][0-9]{0,8}$/D', $room_id)
            || !preg_match('/^[A-Z]{3}$/D', $currency)
            || ($new_token !== '' && !preg_match('/^[!-~]{100,512}$/D', $new_token))) {
            wp_safe_redirect(add_query_arg('result', 'invalid', self::admin_url()));
            exit;
        }

        if (defined('ORTU_BEDS24_TOKEN') || self::read_post('ortu_beds24_forget') === '1') {
            $settings['token'] = '';
        } elseif ($new_token !== '') {
            $settings['token'] = $new_token;
        }
        $settings['property_id'] = (int) $property_id;
        $settings['room_id'] = (int) $room_id;
        $settings['currency'] = $currency;
        update_option(self::SETTINGS, $settings, false);
        delete_transient(self::CACHE);
        wp_safe_redirect(add_query_arg('result', 'saved', self::admin_url()));
        exit;
    }

    private static function admin_url() {
        return admin_url('options-general.php?page=' . self::PAGE);
    }

    public static function admin() {
        if (!current_user_can('manage_options')) {
            return;
        }
        $settings = self::settings();
        $status = isset($_GET['result']) && is_string($_GET['result']) ? $_GET['result'] : '';
        ?>
        <div class="wrap">
            <h1>Démo Beds24</h1>
            <?php if ($status === 'saved') : ?>
                <div class="notice notice-success"><p>Configuration enregistrée.</p></div>
            <?php elseif ($status === 'invalid') : ?>
                <div class="notice notice-error"><p>Vérifiez les identifiants numériques, la devise ISO et le format du jeton.</p></div>
            <?php endif; ?>
            <p>Configurez un jeton longue durée Beds24 en lecture seule, avec le droit de lecture Inventory sur la propriété de test.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="ortu_beds24_save">
                <?php wp_nonce_field('ortu_beds24_save'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="ortu_beds24_property">Identifiant de la propriété</label></th>
                        <td><input type="number" id="ortu_beds24_property" name="ortu_beds24_property" min="1" max="999999999" required value="<?php echo esc_attr($settings['property_id'] ?: ''); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="ortu_beds24_room">Identifiant de l’hébergement</label></th>
                        <td><input type="number" id="ortu_beds24_room" name="ortu_beds24_room" min="1" max="999999999" required value="<?php echo esc_attr($settings['room_id'] ?: ''); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="ortu_beds24_currency">Devise Beds24</label></th>
                        <td><input type="text" id="ortu_beds24_currency" name="ortu_beds24_currency" size="3" maxlength="3" pattern="[A-Za-z]{3}" required value="<?php echo esc_attr($settings['currency']); ?>"></td>
                    </tr>
                    <?php if (defined('ORTU_BEDS24_TOKEN')) : ?>
                        <tr><th scope="row">Jeton API</th><td>Fourni par la configuration serveur.</td></tr>
                    <?php else : ?>
                        <tr>
                            <th scope="row"><label for="ortu_beds24_token">Jeton API en lecture seule</label></th>
                            <td>
                                <input type="password" class="regular-text" id="ortu_beds24_token" name="ortu_beds24_token" autocomplete="new-password" spellcheck="false" maxlength="512">
                                <?php if (self::token($settings) !== '') : ?>
                                    <p class="description">Un jeton est enregistré. Laissez le champ vide pour le conserver.</p>
                                    <label><input type="checkbox" name="ortu_beds24_forget" value="1"> Supprimer le jeton enregistré</label>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endif; ?>
                </table>
                <?php submit_button('Enregistrer la configuration'); ?>
            </form>
            <p>Sur la page de démonstration, ajoutez un bloc Code court contenant <code>[ortu_beds24]</code>.</p>
        </div>
        <?php
    }

    private static function date($value) {
        if (!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $value)) {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, wp_timezone());
        return $date && $date->format('Y-m-d') === $value ? $date : null;
    }

    private static function claim_request() {
        global $wpdb;

        // Claim one shared request slot, including on sites without a persistent object cache.
        $now = time();
        $next = $now + 12;
        $changed = $wpdb->query($wpdb->prepare(
            "INSERT INTO {$wpdb->options} (option_name, option_value, autoload)
             VALUES (%s, %s, 'no')
             ON DUPLICATE KEY UPDATE option_value = IF(CAST(option_value AS UNSIGNED) <= %d, VALUES(option_value), option_value)",
            self::NEXT_REQUEST,
            (string) $next,
            $now
        ));
        return is_int($changed) && $changed > 0;
    }

    private static function public_error($message, $status = 0) {
        return new WP_Error('ortu_beds24_offers', $message, array('status' => $status));
    }

    private static function request($token, $query) {
        $response = wp_safe_remote_get(add_query_arg($query, self::ENDPOINT), array(
            'timeout' => 8,
            'redirection' => 0,
            'limit_response_size' => 65536,
            'headers' => array('Accept' => 'application/json', 'token' => $token),
        ));
        if (is_wp_error($response)) {
            return self::public_error(self::text('service_unavailable'));
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status === 401 || $status === 403) {
            return self::public_error(self::text('service_unavailable'), $status);
        }
        if ($status === 429) {
            global $wpdb;
            $reset = wp_remote_retrieve_header($response, 'x-fivemincreditlimit-resetsin');
            $reset = $reset ?: wp_remote_retrieve_header($response, 'x-five-min-limit-resets-in');
            $wait = min(300, max(30, (int) $reset));
            $wpdb->update($wpdb->options, array('option_value' => time() + $wait), array('option_name' => self::NEXT_REQUEST));
            return self::public_error(self::text('service_unavailable'), $status);
        }
        if ($status !== 200) {
            return self::public_error(self::text('service_unavailable'), $status);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($body) || ($body['success'] ?? null) !== true || !is_array($body['data'] ?? null)) {
            return self::public_error(self::text('service_unavailable'), $status);
        }

        return $body['data'];
    }

    private static function offers($settings, $arrival, $departure, $adults) {
        $token = self::token($settings);
        if ($token === '' || !$settings['property_id'] || !$settings['room_id']) {
            return self::public_error(self::text('service_unavailable'));
        }

        $query = array(
            'propertyId' => (int) $settings['property_id'],
            'roomId' => (int) $settings['room_id'],
            'arrival' => $arrival,
            'departure' => $departure,
            'numAdults' => $adults,
            'numChildren' => 0,
        );
        $key = hash_hmac('sha256', wp_json_encode($query), $token);
        $cached = get_transient(self::CACHE);
        if (is_array($cached) && $cached['key'] === $key) {
            return $cached['result'];
        }
        if (!self::claim_request()) {
            return self::public_error(self::text('search_wait'));
        }

        $rooms = self::request($token, $query);
        if (is_wp_error($rooms)) {
            return $rooms;
        }

        $count = 0;
        $best = null;
        foreach ($rooms as $room) {
            if (!is_array($room) || (int) ($room['roomId'] ?? 0) !== $query['roomId']
                || (int) ($room['propertyId'] ?? 0) !== $query['propertyId']) {
                continue;
            }
            if (!isset($room['offers'])) {
                continue;
            }
            if (!is_array($room['offers'])) {
                return self::public_error(self::text('service_unavailable'), 200);
            }
            foreach ($room['offers'] as $offer) {
                if (!is_array($offer) || (isset($offer['unitsAvailable']) && (int) $offer['unitsAvailable'] < 1)) {
                    continue;
                }
                ++$count;
                $price = $offer['price'] ?? null;
                if (is_numeric($price) && is_finite((float) $price) && (float) $price >= 0
                    && ($best === null || (float) $price < $best)) {
                    $best = (float) $price;
                }
            }
        }
        $result = array('count' => $count, 'price' => $best, 'checked' => time());
        set_transient(self::CACHE, array('key' => $key, 'result' => $result), 60);
        return $result;
    }

    public static function shortcode() {
        $today = current_datetime()->setTime(0, 0);
        $last = $today->modify('+' . self::MAX_ADVANCE . ' days');
        $arrival = '';
        $departure = '';
        $adults = '2';
        $result = null;
        $settings = self::settings();
        if (self::read_post('ortu_beds24_search') === '1') {
            $arrival = self::read_post('ortu_beds24_arrival');
            $departure = self::read_post('ortu_beds24_departure');
            $adults = self::read_post('ortu_beds24_adults');
            $start = self::date($arrival);
            $end = self::date($departure);
            if (!$start || !$end || $start < $today || $end > $last || $end <= $start
                || $end > $start->modify('+' . self::MAX_NIGHTS . ' days')
                || !preg_match('/^[1-8]$/D', $adults)) {
                $result = self::public_error(self::text('invalid_dates'));
            } else {
                $result = self::offers($settings, $arrival, $departure, (int) $adults);
            }
        }

        ob_start();
        ?>
        <section class="oliviers-search" aria-label="<?php echo esc_attr(self::text('search_label')); ?>">
            <form method="post">
                <input type="hidden" name="ortu_beds24_search" value="1">
                <p><label><?php echo esc_html(self::text('arrival')); ?> <input name="ortu_beds24_arrival" type="date" min="<?php echo esc_attr($today->format('Y-m-d')); ?>" max="<?php echo esc_attr($last->format('Y-m-d')); ?>" value="<?php echo esc_attr($arrival); ?>" required></label></p>
                <p><label><?php echo esc_html(self::text('departure')); ?> <input name="ortu_beds24_departure" type="date" min="<?php echo esc_attr($today->modify('+1 day')->format('Y-m-d')); ?>" max="<?php echo esc_attr($last->format('Y-m-d')); ?>" value="<?php echo esc_attr($departure); ?>" required></label></p>
                <p><label><?php echo esc_html(self::text('adults')); ?> <input name="ortu_beds24_adults" type="number" min="1" max="8" step="1" value="<?php echo esc_attr($adults); ?>" required></label></p>
                <p><button type="submit"><?php echo esc_html(self::text('search')); ?></button></p>
            </form>
            <?php if (is_wp_error($result)) : ?>
                <p role="alert"><?php echo esc_html($result->get_error_message()); ?></p>
            <?php elseif (is_array($result)) : ?>
                <div role="status" class="oliviers-result <?php echo $result['count'] === 0 ? 'is-unavailable' : 'is-available'; ?>">
                    <?php if ($result['count'] === 0) : ?>
                        <p><strong><?php echo esc_html(self::text('unavailable')); ?></strong></p>
                        <p><?php echo esc_html(self::text('try_other_dates')); ?></p>
                    <?php elseif ($result['price'] === null) : ?>
                        <p><?php echo esc_html(self::text('service_unavailable')); ?></p>
                    <?php else : ?>
                        <p><strong><?php echo esc_html(self::text('available')); ?></strong></p>
                        <?php
                        $nights = (int) $start->diff($end)->days;
                        $night_word = self::text($nights === 1 ? 'night_singular' : 'night_plural');
                        $adult_word = self::text($adults === '1' ? 'adult_singular' : 'adult_plural');
                        $decimal = self::language() === 'en' ? '.' : ',';
                        $price = number_format($result['price'], 2, $decimal, ' ');
                        ?>
                        <p class="oliviers-stay-summary"><?php echo esc_html($nights . ' ' . $night_word . ' · ' . $adults . ' ' . $adult_word); ?></p>
                        <p class="oliviers-total"><span><?php echo esc_html(self::text('stay_total')); ?></span><strong><?php echo esc_html($price . ' ' . ($settings['currency'] === 'EUR' ? '€' : $settings['currency'])); ?></strong></p>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </section>
        <?php
        return ob_get_clean();
    }
}

Ortu_Beds24_Demo::boot();

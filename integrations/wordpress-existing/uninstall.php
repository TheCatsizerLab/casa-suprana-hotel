<?php

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('ortu_beds24_settings');
delete_option('ortu_beds24_next_request');
delete_transient('ortu_beds24_offers');

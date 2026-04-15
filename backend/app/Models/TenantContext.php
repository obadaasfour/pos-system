<?php

namespace App\Models;

class TenantContext
{
    private static $currentStoreId = null;
    private static $currentStoreFlag = false;

    public static function setStoreId($storeId)
    {
        self::$currentStoreId = $storeId;
        self::$currentStoreFlag = true;
    }

    public static function getStoreId()
    {
        return self::$currentStoreId;
    }

    public static function isSet()
    {
        return self::$currentStoreFlag;
    }

    public static function reset()
    {
        self::$currentStoreId = null;
        self::$currentStoreFlag = false;
    }
}

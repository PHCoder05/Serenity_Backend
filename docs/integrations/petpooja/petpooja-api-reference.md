# PetPooja API Reference Documentation

This document describes all the API endpoints implemented in the `Serenity Backend` for PetPooja Integration. The API endpoints are divided into two categories:
1. **Outbound APIs**: APIs hosted by PetPooja that our backend calls.
2. **Inbound Webhooks**: APIs hosted by us that PetPooja calls.

---

## 1. Outbound APIs (PetPooja Hosted)
For all these endpoints, you must send the following headers:
- `Content-Type`: `application/json`
*(Note: Some APIs expect the authentication credentials inside the JSON body, while `save_order` expects them in headers or body based on Petpooja docs).*

### 1.1 Save Order
**URL:** `{{PETPOOJA_SAVE_ORDER_URL}}`
**Method:** `POST`
**Description:** Pushes a new online order to the PetPooja PoS system.

**Request Body Example:**
```json
{
  "restID": "xxxxxx",
  "orderinfo": {
    "Order": {
      "details": {
        "orderID": "12345",
        "preorder_date": "2026-06-11",
        "preorder_time": "14:30:00",
        "service_charge": "0",
        "sc_tax_amount": "0",
        "order_type": "H",
        "payment_type": "ONLINE",
        "created_on": "2026-06-11 14:00:00"
      }
    }
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": "1",
  "message": "Your order is saved.",
  "restID": "xxxxxx",
  "clientOrderID": "A-1",
  "orderID": "26"
}
```

### 1.2 Fetch Menu
**URL:** `{{PETPOOJA_FETCH_MENU_URL}}`
**Method:** `POST`
**Description:** Fetches the entire menu directly from PetPooja.

**Request Body Example:**
```json
{
  "app_key": "YOUR_APP_KEY",
  "app_secret": "YOUR_APP_SECRET",
  "access_token": "YOUR_ACCESS_TOKEN",
  "restID": "xxxxxx"
}
```

**Success Response (200 OK):**
*(Returns a large JSON object containing categories, items, modifiers, etc. matching the push menu schema)*

### 1.3 Update Order Status
**URL:** `{{PETPOOJA_UPDATE_ORDER_STATUS_URL}}`
**Method:** `POST`
**Description:** Cancels an active order on PetPooja. Currently only supports cancelling status (-1).

**Request Body Example:**
```json
{
  "app_key": "YOUR_APP_KEY",
  "app_secret": "YOUR_APP_SECRET",
  "access_token": "YOUR_ACCESS_TOKEN",
  "restID": "xxxxxx",
  "orderID": "26",
  "clientorderID": "A-1",
  "cancelReason": "Customer requested cancellation",
  "status": "-1"
}
```

**Success Response (200 OK):**
```json
{
  "success": "1",
  "message": "Order status updated successfully.",
  "restID": "xxxxxxx",
  "orderID": "26",
  "status": "-1"
}
```

### 1.4 Rider Status Update
**URL:** `{{PETPOOJA_RIDER_STATUS_URL}}`
**Method:** `POST`
**Description:** Used to push delivery boy (rider) details to the POS so the merchant can track delivery.

**Request Body Example:**
```json
{
  "app_key": "YOUR_APP_KEY",
  "app_secret": "YOUR_APP_SECRET",
  "access_token": "YOUR_ACCESS_TOKEN",
  "order_id": 101010527,
  "outlet_id": "xxxxx",
  "status": "rider-assigned",
  "rider_data": {
    "rider_name": "John Doe",
    "rider_phone_number": "9999999999"
  },
  "external_order_id": ""
}
```

**Success Response (200 OK):**
```json
{
  "code": "200",
  "message": "Rider status saved successfully.",
  "success": "success"
}
```

---

## 2. Inbound Webhooks (Your Hosted APIs)
PetPooja will call these endpoints on your server.
**Authentication:** PetPooja will send the following HTTP headers which your server validates:
- `app-key`
- `app-secret`
- `access-token`

**Base Route:** `/api/v1/petpooja/webhook/*`

### 2.1 Push Menu
**Route:** `POST /push-menu`
**Description:** Called by PetPooja whenever the merchant updates the menu on their end.

**Request Body Example:**
```json
{
  "success": "1",
  "restaurants": [
    {
      "restaurantid": "xxxxxx",
      "active": "1",
      "details": {
        "restaurantname": "Pizza Express"
      }
    }
  ]
}
```

**Your Server Response (200 OK):**
```json
{
  "success": "1",
  "message": "Menu items are successfully listed."
}
```

### 2.2 Order Callback
**Route:** `POST /callback`
**Description:** Called by PetPooja to notify your server about order status changes (Accepted, Dispatched, Delivered, Cancelled).

**Request Body Example:**
```json
{
  "restID": "xxxxxx",
  "orderID": "A-1",
  "status": "1",
  "cancel_reason": "",
  "minimum_prep_time": 20,
  "minimum_delivery_time": "",
  "rider_name": "",
  "rider_phone_number": "",
  "is_modified": "No"
}
```
*(No exact response body is mandated by the docs, standard 200 OK JSON applies)*

### 2.3 Update Item/Addon In Stock
**Route:** `POST /item-stock`
**Description:** Called by PetPooja when an item is marked IN STOCK at the restaurant level.

**Request Body Example:**
```json
{
  "restID": "xxxx",
  "type": "item",
  "inStock": true,
  "itemID": ["7778660", "7778659"]
}
```

**Your Server Response (200 OK):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Stock status updated successfully"
}
```

### 2.4 Update Item/Addon Out of Stock
**Route:** `POST /item-stock-off`
**Description:** Called by PetPooja when an item is marked OUT OF STOCK.

**Request Body Example:**
```json
{
  "restID": "xxxx",
  "type": "item",
  "inStock": false,
  "itemID": ["7532306"],
  "autoTurnOnTime": "custom",
  "customTurnOnTime": "2020-02-24 18:00"
}
```

**Your Server Response (200 OK):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Stock status updated successfully"
}
```

### 2.5 Get Store Status
**Route:** `POST /get-store-status`
**Description:** Allows Petpooja to ask if your online store is open or closed for this merchant.

**Request Body Example:**
```json
{
  "restID": "xxxx"
}
```

**Your Server Response (200 OK):**
```json
{
  "http_code": 200,
  "status": "success",
  "store_status": "1",
  "message": "Store Delivery Status fetched successfully"
}
```

### 2.6 Update Store Status
**Route:** `POST /update-store-status`
**Description:** Called when the merchant explicitly toggles "Store Online / Offline" via the POS interface.

**Request Body Example:**
```json
{
  "restID": "xxxx",
  "store_status": 0,
  "turn_on_time": "2023-02-17 00:00:00",
  "reason": "Rain"
}
```

**Your Server Response (200 OK):**
```json
{
  "http_code": 200,
  "status": "success",
  "message": "Store Status updated successfully for store restID"
}
```

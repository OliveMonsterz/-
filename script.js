// ICONS : https://pictogrammers.github.io/@mdi/font/6.5.95/
// ICONS : https://fontawesome.com/search
new Vue({
  el: '#app',
  vuetify: new Vuetify({
    theme: {
      themes: {
        light: {
          primary: '#F9C200',
        },
      },
    },
  }),
  data: {
    scriptUrl: HOST_NAME + API_URL,
    isLoading: false,
    isShowingDetail: false,
    linkId: null,
    redirectStore: null,
    selectedItem: null,
    data: Object,
    items: [],
    displayItems: [],
    copyButtonTitle: 'Copy',
    searchTimer: null,
    categories: [
      'discount',
      'desk setup',
      'wallpaper',
      'keyboard',
      'mousepad',
      'ghibli',
      'figure',
      'speaker',
      'case',
    ],
    selectedCategory: '',
    isTH: false,
    searchInput: '',
    social: [
      {
        name: 'YouTube',
        icon: 'fab fa-youtube',
        url: 'https://youtube.com/@swiitsour',
      },
      {
        name: 'Pinterest',
        icon: 'fab fa-pinterest',
        url: 'https://pinterest.com/swiitsour',
      },
      {
        name: 'TikTok',
        icon: 'fab fa-tiktok',
        url: 'https://tiktok.com/@swiitsour',
      },
      {
        name: 'Instagram',
        icon: 'fab fa-instagram',
        url: 'https://instagram.com/swiitsour',
      },
    ],
  },
  mounted: function () {
    this.isTH = Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone.includes('Bangkok');

    let urlParams = new URLSearchParams(window.location.search);
    this.linkId = urlParams.get('id');
    this.redirectStore = urlParams.get('r');

    this.getList();
  },
  watch: {},
  methods: {
    getList() {
      this.isLoading = true;
      fetch(this.scriptUrl)
        .then((response) => response.json())
        .then((json) => {
          this.data = json;

          this.checkRedirect();
        });
    },
    checkRedirect() {
      if (this.linkId) {
        let foundItem = this.data.find((item) => {
          return item.linkId == this.linkId;
        });
        if (foundItem) {
          if (this.isTH) {
            if (this.checkRedirectThaiStore(foundItem)) {
              return;
            }
          } else {
            if (this.checkRedirectAmazonStore(foundItem)) {
              return;
            }
          }
        }
      }

      this.getItems();
      this.isLoading = false;
    },
    checkRedirectThaiStore(foundItem) {
      var redirectUrl = '';
      var store = '';

      if (this.redirectStore == 's' && foundItem.shopeeUrl != '') {
        redirectUrl = foundItem.shopeeUrl;
        store = 'shopee';
      }
      if (this.redirectStore == 'l' && foundItem.lazadaUrl != '') {
        redirectUrl = foundItem.lazadaUrl;
        store = 'lazada';
      }

      if (redirectUrl != '') {
        this.logEvent('redirect', {
          store_type: this.logStoreType(),
          link_id: foundItem.linkId,
          link_title: foundItem.title,
          redirect_store: store,
        });
        window.location.replace(this.getRefUrl(redirectUrl));
        return true;
      }
      return false;
    },
    checkRedirectAmazonStore(foundItem) {
      if (
        foundItem.globalStoreUrl != '' &&
        (foundItem.globalStoreUrl.includes('amazon.com') ||
          foundItem.globalStoreUrl.includes('amzn.to'))
      ) {
        this.logEvent('redirect', {
          store_type: this.logStoreType(),
          link_id: foundItem.linkId,
          link_title: foundItem.title,
          redirect_store: 'amazon',
        });
        window.location.replace(foundItem.globalStoreUrl);
        return true;
      }
      return false;
    },
    getRefUrl(url) {
      var refUrl = url;
      if (url.includes('shopee')) {
        refUrl = '/re?url=' + encodeURIComponent(refUrl);
      }
      return refUrl;
    },
    getItems() {
      for (var item of this.data) {
        if (!item.imageUrl.includes('https')) {
          item.imageUrl = HOST_NAME + item.imageUrl;
        }
        if (!this.isTH || item.thaiStoreUrl == '') {
          item.discount = item.globalDiscount;
          item.storeUrl = item.globalStoreUrl;
          item.code = item.globalCode;
        } else {
          item.discount = item.thaiDiscount;
          item.storeUrl = item.thaiStoreUrl;
          item.code = item.thaiCode;
        }
      }
      this.items = this.data.filter((item) => {
        return item.storeUrl != '';
      });
      this.displayItems = this.items;

      // ถ้าระบุ id มา ให้แสดง dialog id นั้น
      if (this.linkId) {
        let foundItem = this.items.find((item) => {
          return item.linkId == this.linkId;
        });
        if (foundItem) {
          this.selectedItem = foundItem;
          this.isShowingDetail = true;
          this.logEvent('show_link_by_id', {
            store_type: this.logStoreType(),
            link_id: foundItem.linkId,
            link_title: foundItem.title,
          });
        }
      }
    },
    toggleStore() {
      this.isTH = !this.isTH;
      this.selectedCategory = '';
      this.searchInput = '';
      this.getItems();
    },
    getHighlights() {
      this.highlights = this.data.filter((item) => {
        return item.isHighlighted == true;
      });
    },
    showDetail(item) {
      this.isShowingDetail = true;
      this.selectedItem = item;
      this.trackLink(item, 'link_select');
    },
    linkClicked(item) {
      this.openLink(this.getRefUrl(item.storeUrl));
      this.trackLink(item, 'link_click');
    },
    trackLink(item, eventName) {
      let params = {
        store_type: this.logStoreType(),
        link_id: item.linkId,
        link_url: item.storeUrl,
        link_title: item.title,
      };
      this.logEvent(eventName, params);
    },
    socialClick(social) {
      this.openLink(social.url);
      let params = {
        store_type: this.logStoreType(),
        link_url: social.url,
        link_title: social.name,
      };
      this.logEvent('link_social_click', params);
    },
    logEvent(eventName, params) {
      gtag('event', eventName, params);
    },
    logStoreType() {
      return this.isTH ? 'thai' : 'global';
    },
    getShopButtonTitle(item) {
      var urlString = item.storeUrl;
      if (!urlString.includes('https://')) {
        urlString = 'https://' + urlString;
      }
      var hostname = new URL(urlString).hostname.replace('www.', '');
      var splits = hostname.split('.');
      if (
        hostname.includes('goeco') ||
        hostname.includes('tidd.ly') ||
        splits.length > 2
      ) {
        hostname = 'shop';
      } else if (hostname.includes('ebay')) {
        hostname = 'ebay.com';
      } else if (hostname.includes('amzn')) {
        hostname = 'amazon.com';
      }
      return 'Go to ' + hostname;
    },
    openLink(url) {
      window.open(url, '_blank');
    },
    copyCode(item) {
      this.copyToClipboard(item.code);
      this.copyButtonTitle = 'Copied!';
      setTimeout(() => {
        this.copyButtonTitle = 'Copy';
      }, 1000);
      let params = {
        store_type: this.logStoreType(),
        link_id: item.linkId,
        link_url: item.storeUrl,
        link_title: item.title,
        copy_code: item.code,
      };
      this.logEvent('link_copy_code', params);
    },
    copyToClipboard(text) {
      navigator.clipboard.writeText(text);
    },
    onSearchChanged() {
      this.search();
    },
    onSearchBlur() {},
    search() {
      clearTimeout(this.searchTimer);

      let string = this.searchInput.toLowerCase();

      this.searchTimer = setTimeout(() => {
        if (string) {
          this.logEvent('search', {
            store_type: this.logStoreType(),
            keyword: string,
          });
        }
      }, 2000);

      let cat = this.selectedCategory;
      if (cat == '' && string == '') {
        this.displayItems = this.items;
      } else {
        this.displayItems = this.items.filter((item) => {
          if (cat == 'discount') {
            return item.discount != '' && this.isMatched(string, item);
          } else if (cat != '') {
            return this.isMatched(string, item) && this.isMatched(cat, item);
          } else {
            return this.isMatched(string, item);
          }
        });
      }
    },
    isMatched(keyword, item) {
      var matched = true;
      if (keyword != '') {
        matched =
          item.title.toLowerCase().includes(keyword) ||
          item.subtitle.toLowerCase().includes(keyword);
      }
      return matched;
    },
    filterClick(category) {
      if (category == this.selectedCategory) {
        this.selectedCategory = '';
      } else {
        this.selectedCategory = category;
        this.logEvent('filter_click', {
          store_type: this.logStoreType(),
          filter_name: category,
        });
      }
      this.search();
    },
    clearSearch() {
      this.searchInput = '';
      this.search();
    },
    created() {},
  },
});
